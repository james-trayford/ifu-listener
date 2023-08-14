
This has been tested so far using a virtual environment to install the correct dependencies. I use an `ipython` `venv`

For local development in a clean repo, first enter the app directory

```
cd ifu-listener
```

Now, set up and activate a virtual environment for a clean install

```
python3 -m venv ifu-venv
source ifu-venv/bin/activate
```

Then, intall the required libraries with `pip`

```
pip3 install -r requirements.txt
```

## Setting Up Sound Grid

This approach pre-renders the audification for each spaxel. When in the virtual environment, above, change into the `listener-app` sub-directory:

`cd listener-app`

Download the example data set (we want to try different datasets and standardise the pipeline)

`python3 get_data.py`

and render the grid:

`python3 render_soundgrid.py`

Curently, most of the processing nd parameters are hard coded - but there are many things we can change here which will strongly affect how the spectrum sounds (e.g. continuum subtraction, frequency mapping range, _'contrast'_, etc.)

## Serving Locally

This works in the browser, so make sure you are in the virtual environment setup above, e.g.

```
source mi-env/bin/activate 
```

Now, set up the server, for example on port `8080`

```
gunicorn -b :8080 app:app
```

The app can now be opened in your browser via address `localhost:8080`