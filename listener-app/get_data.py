import glob
import os
import urllib.request
import zipfile

outdir = "./DataCubes"

path = os.path.realpath(outdir)
if not glob.glob(outdir): 
  os.mkdir(path)  
    
fname = "NGC7319_nucleus_MIRI_MRS.zip"
url = "https://drive.google.com/uc?export=download&confirm=9iBg&id=1HhDXac-oQpmaEEoLnQaRbl438DZngS5l"

print(f"Downloading files...")
with urllib.request.urlopen(url) as response, open(f"{path}/{fname}", 'wb') as out_file:
  data = response.read() # a `bytes` object
  out_file.write(data)

print(f"Unzipping files to {outdir}/Data ...")
with zipfile.ZipFile(f"{outdir}/{fname}", 'r') as zip_ref:
    zip_ref.extractall(f"{outdir}")

print(f"Clearing up...")
os.remove(f"{path}/{fname}")

print("Done.")
