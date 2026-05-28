# -*- coding: utf-8 -*-
"""
Ludo Master Elite - Flask Frontend Server
Chi serve HTML pages. Toan bo API va Socket.IO do Node.js backend (port 3001) xu ly.
Chay: py app.py  ->  http://localhost:5000
"""

from flask import Flask, render_template
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PORT     = 5000

app = Flask(__name__)

# ─────────────────────────────────────────────────────────────
# PAGE ROUTES — chi serve HTML, khong co API
# ─────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/lobby')
def lobby():
    return render_template('lobby.html')

@app.route('/room/<room_id>')
def room(room_id):
    return render_template('room.html', room_id=room_id)

@app.route('/game/<game_id>')
def game(game_id):
    return render_template('game.html', game_id=game_id)

@app.route('/profile')
def profile():
    return render_template('profile.html')

# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print('=' * 50)
    print('  LUDO MASTER ELITE -- Frontend Server')
    print('=' * 50)
    print('  Frontend : http://localhost:{}'.format(PORT))
    print('  Backend  : http://localhost:3001  (Node.js)')
    print('=' * 50)
    app.run(debug=True, host='0.0.0.0', port=PORT)
