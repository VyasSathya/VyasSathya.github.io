"""Build the project catalog and static product pages."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name("build-product-pages.py")),run_name="__main__")
