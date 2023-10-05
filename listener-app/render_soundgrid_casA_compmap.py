# strauss imports
from strauss.sonification import Sonification
from strauss.sources import Events, Objects
from strauss import channels
from strauss.score import Score
from strauss.generator import Sampler, Synthesizer, Spectralizer
from strauss import sources as Sources 
import strauss
import wavio as wav
from scipy.special import erf
from scipy.io import wavfile
import time

# other useful modules
import matplotlib.pyplot as plt
import numpy as np
import astropy.io.fits as pyfits
import glob
from scipy.interpolate import interp1d

# which channel do we want to use (1,2,3 or 4)?
ch = 2

acontrast = 1.*1.4
vcontrast = 0.6

# specify audio system (e.g. mono, stereo, 5.1, ...)
system = "mono"
length = 1.1

# set uo score object for sonification
score =  Score([["D2","A2", "E3", "B3", "F#4"]], length)
score =  Score([["E2","B2", "F#3", "C#4", "G#4"]], length)
# score =  Score([["C3","F3", "Bb3", "Eb4", "Ab4"]], length)
generator = Synthesizer()
generator.load_preset('pitch_mapper')

def get_continuum(wavelengths, spectrum, deg=12):
    # we fit the continuum of the spectrum as 
    # p[0]*wavelengths**deg + p[1]*wavelengths**(deg-1) + ... + p[deg]*wavelengths**0
    # using fancy array operations...
    powers = np.arange(deg+1)[::-1]
    p = np.polyfit(wavelengths, spectrum, deg=deg)
    return (np.column_stack([p]*wavelengths.size) * pow(wavelengths, np.column_stack([powers]*wavelengths.size))).sum(axis=0)

def dsamp_ifu(a, dsamp):
    a = a.copy().T
    preshape = a.shape[:-1]
    remx = preshape[0]%dsamp
    remy = preshape[1]%dsamp
    augx = (dsamp-remx)%dsamp
    augy = (dsamp-remy)%dsamp
    
    host = np.zeros((preshape[0]+augx, preshape[1]+augy, a.shape[-1]))
    offstx = augx//2
    offsty = augy//2
    print(remx,remy, host.shape, offstx, host.shape[0]-augx+offstx,  offsty, host.shape[1]-augy+offsty)
    host[offstx:host.shape[0]-augx+offstx, offsty:host.shape[1]-augy+offsty,:] = a
    shape = (host.shape[0]//dsamp, host.shape[1]//dsamp)
    sh = shape[0],host.shape[0]//shape[0],shape[1],host.shape[1]//shape[1], host.shape[-1]
    return host.reshape(sh).mean(-2).mean(1).T

#fname = f'DataCubes/NGC7319_nucleus_MIRI_MRS/JWST/*ch{ch}*/*.fits'
#fname = f'DataCubes/J1316+1753_240222.fits'
# fname = f'DataCubes/Level3_ch1-long_s3d.fits'
fname = f'DataCubes/casA_components_stacked.fits'

for f in glob.glob(fname):

    t0 = time.time()
    data, header = pyfits.getdata(f, header=True)
    print(data.shape)

    data[np.isnan(data)] = 0.

    data = dsamp_ifu(data,2)
    
    maxpos = np.unravel_index(np.argmax(data.sum(0)), data.shape[1:])
    
    r_cen = maxpos[::-1]
    # r_cen = (data.shape[1]//2, data.shape[2]//2)
    print(r_cen)

    #wlens = np.linspace(1000,5000,data.shape[0])
    ap = 16
    censel = data[:,r_cen[1]-ap:r_cen[1]+ap,r_cen[0]-ap:r_cen[0]+ap]
    # censel = data[:, 3:-3, :]
    print(censel)
    plt.imshow(np.clip(censel.sum(0), 0, np.percentile(censel.sum(0), 99.8))**vcontrast)
    vols = np.clip(censel.sum(0), 0, np.percentile(censel.sum(0), 99.8))**vcontrast
    vols[np.isnan(vols)] = 0
    vols /= vols.max()
    print(vols)
    plt.show()
    nsamp = int(48000 * 0.1 // 1)
    fade = np.linspace(0.,1.,nsamp)

    t1 = time.time()

    print(f"setup {t1-t0:.2f} s")
    
    pixcol = []
    plt.figure(figsize=(16,16))


    barx = np.linspace(0.5, data.shape[0]+0.5, data.shape[0]*2+1)
    barxfine = np.linspace(barx[0], barx[-1], 300)
    wlens = barxfine
    spec = np.zeros((wlens.size, censel.shape[1]*censel.shape[2]))    
    for i in range(censel.shape[1]):
        for j in range(censel.shape[2]):
            # plt.subplot2grid((ap*2,ap*2), (i,j))
            # plt.plot(wlens,censel[:,i,j])
            # plt.axis('off')
            # cont_avg = get_continuum(wlens, censel[:,i,j], 2)
            # consub = censel[:,i,j]-np.percentile(censel[:,i,j], 50)
            # consub[consub < consub.max()*0.001] = 0.#0.15
            # # consub[consub < 0] =
            pars = {'volume':list(censel[:,i,j]/censel[:,i,j].max()), 'pitch':list(np.arange(censel.shape[0])/censel.shape[0])}
            print (pars)
            # pars = {'spectrum':[(consub[::-1] == consub[::-1].max()).astype(float)], 'pitch':[1]}
            bary = np.array(list(zip(np.zeros(len(pars['pitch'])),pars['volume']))+[(0,0)]).flatten()[:-1]

            spec[:, i*censel.shape[1]+j] = interp1d(barx, bary, kind='nearest')(barxfine)*vols[i,j]
            # plt.plot()
            sources = Events(pars.keys())
            sources.fromdict(pars)
            sources.apply_mapping_functions()
            soni = Sonification(score, sources, generator, system)
            soni.render()
            print(vols[i,j])
            soni.save(f'static/audio/snd_{i}_{j}.wav', master_volume=vols[i,j]**(1.15*0.8))
            pixcol.append(plt.cm.magma(vols[i,j])[:-1])
            # plt.plot(wlens, consub)
            wave = wav.read(f'static/audio/snd_{i}_{j}.wav')
            if i ==150 and j == 150:
                plt.close()
                print(list(pars['spectrum'][0]))
                plt.plot(pars['spectrum'][0])
                plt.show()
            cwave = np.array(wave.data[:-nsamp], dtype='float64')[:,0]
            cwave[:nsamp] *= fade
            cwave[:nsamp] += np.array(wave.data[-nsamp:], dtype='float64')[:,0] * fade[::-1]
            # plt.plot(cwave[:nsamp])
            # plt.plot(cwave[::-1][:nsamp])
            # plt.show()
            mx = 2**31 -1
            wavfile.write(f'static/audio/snd_{i}_{j}.wav', 48000, cwave.astype('int32'))
            # plt.semilogy()
    t2 = time.time()
    print(f"setup {t2-t1:.2f} s")

    intspec = spec.sum(axis=-1)

    outspec = np.clip((spec.T/spec.max()), 1e-4,1)
    # outspec = np.log10(outspec)
    
    np.savetxt('static/pixcols.csv', (np.row_stack(pixcol)*255).astype(int), delimiter=',', fmt='%d')
    np.savetxt('static/wlens.csv', wlens, delimiter=',', fmt='%e')
    np.savetxt('static/spec.csv', np.row_stack([wlens,outspec]), delimiter=',', fmt='%e')

    
    # np.savetxt('static/pixcols.csv', (np.row_stack(pixcol)*255).astype(int), delimiter=',', fmt='%d')
    # np.savetxt('static/wlens.csv', wlens, delimiter=',', fmt='%e')
    # np.savetxt('static/spec.csv', np.row_stack([wlens,(spec.T/spec.max())]), delimiter=',', fmt='%e')
    # plt.show()    
    
    plt.title(f'Average Spectrum for Channel {ch} Data Cube')
    # plt.plot(wlens,data.mean(-1).mean(-1))

    plt.xlabel(header['CUNIT3'])
    plt.show()
