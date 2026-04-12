from config import PORT
from main import app


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
