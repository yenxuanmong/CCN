"""Chạy: python run.py"""
import subprocess, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
try:
    import flask_socketio, jwt
except ImportError:
    print("Cài dependencies...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt', '-q'])
exec(open('app.py').read())
