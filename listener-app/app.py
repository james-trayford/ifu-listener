from flask import Flask, render_template, redirect, url_for
from flask_wtf import FlaskForm
from flask_wtf.file import FileField
from werkzeug.utils import secure_filename
from render_soundgrid import make_grid
import math
import os

upload_folder = './DataCubes'

app = Flask(__name__)
SECRET_KEY = os.urandom(32)
app.config['SECRET_KEY'] = SECRET_KEY

class UploadForm(FlaskForm):
    file = FileField()

@app.route('/', methods=['GET', 'POST'])
def select_datacube():
    form = UploadForm()
    nspaxel = sum(1 for _ in open('static/pixcols.csv'))
    nside = math.isqrt(nspaxel)
    metadata = {'nside': nside}

    if form.validate_on_submit():
        filename = secure_filename(form.file.data.filename)
        fname = os.path.join(upload_folder, filename)
        form.file.data.save(fname)
        make_grid(fname)
        nspaxel = sum(1 for _ in open('static/pixcols.csv'))
        nside = math.isqrt(nspaxel)
        metadata = {'nside': nside}
        return redirect(url_for('select_datacube', metadata=metadata))

    return render_template('select_datacube.html', form=form, metadata=metadata)

#    if request.method == 'POST':
#        filename = request.form['filename']
#        fname = os.path.join(upload_folder, filename)
#        make_grid(fname)
#        nspaxel = sum(1 for _ in open('static/pixcols.csv'))
#        nside = math.isqrt(nspaxel)
#        metadata = {'nside': nside}
#        return redirect(url_for('select_datacube', metadata=metadata))
#    else:
#        return render_template('select_datacube.html', metadata=metadata)
       
if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)
    
