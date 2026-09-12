import os
import sys

# Ensure current working directory is in python module path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", os.getenv("SERVER_PORT", 15511)))
    uvicorn.run(app, host="0.0.0.0", port=port)
