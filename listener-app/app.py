from flask import Flask, request, render_template, redirect, url_for
from render_soundgrid import make_grid
import math
import os

upload_folder = './DataCubes'

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def select_datacube():
    nspaxel = sum(1 for _ in open('static/pixcols.csv'))
    nside = math.isqrt(nspaxel)
    metadata = {'nside': nside}
    if request.method == 'POST':
        filename = request.form['filename']
#        filename = request.files['file']
        fname = os.path.join(upload_folder, filename)
        make_grid(fname)
        nspaxel = sum(1 for _ in open('static/pixcols.csv'))
        nside = math.isqrt(nspaxel)
        metadata = {'nside': nside}
        return redirect(url_for('select_datacube', metadata=metadata))
    else:
        return render_template('select_datacube.html', metadata=metadata)
       
if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)
    
