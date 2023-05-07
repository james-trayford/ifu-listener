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

# other useful modules
import matplotlib.pyplot as plt
import numpy as np
import astropy.io.fits as pyfits
import glob

# which channel do we want to use (1,2,3 or 4)?
ch = 3

contrast = 0.55

# specify audio system (e.g. mono, stereo, 5.1, ...)
system = "mono"
length = 1.1

# set uo score object for sonification
score =  Score(["C3"], length)
generator = Spectralizer()
generator.modify_preset({'min_freq':150, 'max_freq':800})

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

for f in glob.glob(f'DataCubes/NGC7319_nucleus_MIRI_MRS/JWST/*ch{ch}*/*.fits'):
    data, header = pyfits.getdata(f, header=True)
    print(data.shape)

    data = dsamp_ifu(data,1)[:]
    
    maxpos = np.unravel_index(np.argmax(data.sum(0)), data.shape[1:])
    print(maxpos)
    r_cen = maxpos[::-1]
    wlens = np.linspace(header['CRVAL3'], (data.shape[0]-1)*header['CDELT3']+header['CRVAL3'], data.shape[0])
    ap = 9
    censel = data[:,r_cen[1]-ap:r_cen[1]+ap,r_cen[0]-ap:r_cen[0]+ap]

    plt.imshow(censel.sum(0)**contrast)
    vols = censel.sum(0)**contrast
    vols[np.isnan(vols)] = 0
    vols /= vols.max()
    print(vols)
    plt.show()

    nsamp = int(48000 * 0.1 // 1)
    fade = np.linspace(0.,1.,nsamp)
    
    
    pixcol = []
    for i in range(censel.shape[1]):
        for j in range(censel.shape[2]):
            plt.subplot2grid((ap*2,ap*2), (i,j))
            # plt.plot(wlens,censel[:,i,j])
            plt.axis('off')
            cont_avg = get_continuum(wlens, censel[:,i,j], 5)
            consub = censel[:,i,j]-cont_avg
            consub[consub < consub.max()/35] = 0.
            pars = {'spectrum':[consub[::-1]], 'pitch':[1]}
            sources = Objects(pars.keys())
            sources.fromdict(pars)
            sources.apply_mapping_functions()
            soni = Sonification(score, sources, generator, system)
            soni.render()
            soni.save(f'static/audio/snd_{i}_{j}.wav', master_volume=vols[i,j])
            pixcol.append(plt.cm.magma(vols[i,j])[:-1])
            plt.plot(wlens, consub)
            wave = wav.read(f'static/audio/snd_{i}_{j}.wav')

            cwave = np.array(wave.data[:-nsamp], dtype='float64')[:,0]
            print(cwave.shape)
            cwave[:nsamp] *= fade
            cwave[:nsamp] += np.array(wave.data[-nsamp:], dtype='float64')[:,0] * fade[::-1]
            # plt.plot(cwave[:nsamp])
            # plt.plot(cwave[::-1][:nsamp])
            # plt.show()
            print(cwave.max())
            mx = 2**31 -1
            wavfile.write(f'static/audio/snd_{i}_{j}.wav', 48000, cwave.astype('int32'))
            # plt.semilogy()
    np.savetxt('static/pixcols.csv', (np.row_stack(pixcol)*255).astype(int), delimiter=',', fmt='%d')
    plt.show()    
    
    plt.title(f'Average Spectrum for Channel {ch} Data Cube')
    plt.plot(wlens,data.mean(-1).mean(-1))

    plt.xlabel(header['CUNIT3'])
    plt.show()
