# lukeschreiber.com

My personal site — electrical and computer engineering work, mostly instrumentation:
getting a physical quantity into a wire, into a number, and into a decision.

Live at **[lukeschreiber.com](https://lukeschreiber.com)**.

## Stack

Hand-written HTML, one stylesheet, and ~40 lines of JavaScript. No framework, no build
step, no dependencies. Served straight from this repository by GitHub Pages.

That is a deliberate choice: the site is a handful of documents, and a document does not
need a toolchain.

## Running it locally

There is nothing to install or compile. Open `index.html` in a browser, or serve the
folder to get clean directory URLs:

```sh
python -m http.server 8000   # then open http://localhost:8000
```

## Layout

```
index.html              Bio and the project / work / education index
books/                  Reading list
projects/
  rocket-test-stand/        Solid rocket motor static test stand (NASA Glenn)
  rocket-flight-computer/   Model rocket and ESP32-S3 flight computer
  neural-network-accelerator/  ASL classifier on FPGA fabric
  barbell-velocity-tracker/    VeloLift encoder-based bar speed tracker
  nasa-glenn/               Space Environments Test Branch internship
style.css               Every style on the site
theme.js                Light/dark toggle and the footer clock
404.html                Custom not-found page
```

Project images live in `projects/<name>/img/`, resized to a max width of 1600 px and
kept under ~250 KB each.

## Deployment

Pushing to `main` publishes. `CNAME` holds the custom domain and `.nojekyll` disables
Jekyll processing, so files are served exactly as committed.
