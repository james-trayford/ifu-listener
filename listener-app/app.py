from flask import Flask, render_template
import math

app = Flask(__name__)

@app.route('/')
def index():
    nspaxel = sum(1 for _ in open('static/pixcols.csv'))
    nside = math.isqrt(nspaxel)
    metadata = {'nside': nside}
    return render_template('new.html',metadata=metadata)

if __name__ == '__main__':
    app.run(debug=True)
