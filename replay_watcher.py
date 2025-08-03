import os
import time
import json
import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from supabase import create_client, Client
from wc3parser import WC3Replay

# === CONFIGURACIÓN ===

SUPABASE_URL = 'https://uvggwcpwgnvaczczyyyh.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2Z2d3Y3B3Z252YWN6Y3p5eXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMTA5NDgsImV4cCI6MjA2OTU4Njk0OH0.XjgRRGv4c0Bu8t5Kj3w8zjR5-uAaI2E1TJJPaDRZsRM'
DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1388159548094681168/eqc-O4mY1PjdDun1y7V0zRf6gsWykTCKSCi-RFnwJjMlbNqRNazx_DqznnfJiVLg1pNK'

REPLAY_FOLDER = os.path.expanduser("~/Documents/Warcraft III/Replay/Autosaved")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_replay(path):
    print(f"🎮 Parseando replay: {path}")
    replay = WC3Replay(path)
    replay.parse()

    jugadores = []
    for player in replay.players:
        jugadores.append({
            "nombre": player.name,
            "faccion": player.race,
            "ganador": player.winner
        })

    ganador = next((j["nombre"] for j in jugadores if j["ganador"]), "Desconocido")

    return {
        "jugadores": jugadores,
        "ganador": ganador,
        "duracion": int(replay.duration.total_seconds()),
        "raw_data": replay.to_dict()
    }

def subir_a_supabase(datos):
    res = supabase.table("partidas").insert([datos]).execute()
    print("✅ Datos subidos a Supabase:", res)
    return res

def anunciar_en_discord(datos):
    minutos = datos['duracion'] // 60
    segundos = datos['duracion'] % 60

    embed = {
        "title": "🏆 ¡Partida completada!",
        "description": f"**Ganador:** {datos['ganador']}\n**Duración:** {minutos}m {segundos}s",
        "color": 0x00ffaa,
        "fields": [
            {
                "name": jugador['nombre'],
                "value": f"Facción: {jugador['faccion']}" + (" ✅" if jugador['ganador'] else ""),
                "inline": True
            } for jugador in datos['jugadores']
        ],
        "footer": {
            "text": "Latin Chaos • Warcraft 3",
        }
    }

    payload = {
        "embeds": [embed],
        "username": "Latin Chaos Bot",
        "avatar_url": "https://i.imgur.com/3G3X1Ry.png"
    }

    response = requests.post(DISCORD_WEBHOOK_URL, json=payload)
    if response.status_code == 204:
        print("📢 Resultado anunciado en Discord.")
    else:
        print("❌ Error al enviar a Discord:", response.text)

class ReplayHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory or not event.src_path.endswith(".w3g"):
            return
        time.sleep(2)  # Esperar a que se termine de guardar el archivo
        datos = parse_replay(event.src_path)
        subir_a_supabase(datos)
        anunciar_en_discord(datos)

if __name__ == "__main__":
    print("⏳ Esperando replays...")
    event_handler = ReplayHandler()
    observer = Observer()
    observer.schedule(event_handler, REPLAY_FOLDER, recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
