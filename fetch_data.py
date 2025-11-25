import requests
import json
import re
import time

BODIES = [
    {"name": "Sun", "id": "10"},
    {"name": "Mercury", "id": "199"},
    {"name": "Venus", "id": "299"},
    {"name": "Earth", "id": "399"},
    {"name": "Moon", "id": "301"},
    {"name": "Mars", "id": "499"},
    {"name": "Phobos", "id": "401"},
    {"name": "Deimos", "id": "402"},
    {"name": "Jupiter", "id": "599"},
    {"name": "Io", "id": "501"},
    {"name": "Europa", "id": "502"},
    {"name": "Ganymede", "id": "503"},
    {"name": "Callisto", "id": "504"},
    {"name": "Saturn", "id": "699"},
    {"name": "Titan", "id": "606"},
    {"name": "Enceladus", "id": "602"},
    {"name": "Uranus", "id": "799"},
    {"name": "Titania", "id": "703"},
    {"name": "Oberon", "id": "704"},
    {"name": "Neptune", "id": "899"},
    {"name": "Triton", "id": "801"}
]

BASE_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'

def fetch_body(name, body_id):
    params = {
        'format': 'json',
        'COMMAND': f"'{body_id}'",
        'OBJ_DATA': "'YES'",
        'MAKE_EPHEM': "'YES'",
        'EPHEM_TYPE': "'VECTORS'",
        'CENTER': "'@sun'",
        'START_TIME': "'2025-11-25'",
        'STOP_TIME': "'2025-11-26'",
        'STEP_SIZE': "'1d'",
        'OUT_UNITS': "'KM-S'"
    }
    
    try:
        url = f"{BASE_URL}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
        response = requests.get(url)
        data = response.json()
        result = data['result']
        
        soe = result.find('$$SOE')
        eoe = result.find('$$EOE')
        
        if soe == -1 or eoe == -1:
            return None
            
        ephem = result[soe:eoe]
        
        # Regex to find X, Y, Z, VX, VY, VZ
        # Look for pattern like "X = 1.234E+08 Y = ..."
        # Note: The format might vary slightly, but usually it's X = ... Y = ... Z = ...
        
        def get_val(label):
            match = re.search(f"{label}\s*=\s*([+-]?\d+(?:\.\d+)?(?:E[+-]?\d+)?)", ephem, re.IGNORECASE)
            if match:
                return float(match.group(1))
            return 0.0

        x = get_val('X') * 1000 # Convert km to m
        y = get_val('Y') * 1000
        z = get_val('Z') * 1000
        vx = get_val('VX') * 1000
        vy = get_val('VY') * 1000
        vz = get_val('VZ') * 1000
        
        return {
            "name": name,
            "pos": [x, y, z],
            "vel": [vx, vy, vz]
        }
        
    except Exception as e:
        print(f"Error fetching {name}: {e}")
        return None

with open('src/data/fallbackData.ts', 'w') as f:
    f.write("import * as THREE from 'three';\n\n")
    f.write("export const FALLBACK_DATA: Record<string, { pos: THREE.Vector3, vel: THREE.Vector3 }> = {\n")

    for body in BODIES:
        data = fetch_body(body['name'], body['id'])
        if data:
            px = data['pos'][0]
            py = data['pos'][1]
            pz = data['pos'][2]
            
            vx = data['vel'][0]
            vy = data['vel'][1]
            vz = data['vel'][2]
            
            # Convert to Scene coordinates: x=x, y=z, z=-y
            sx = px
            sy = pz
            sz = -py
            
            svx = vx
            svy = vz
            svz = -vy
            
            f.write(f"  '{body['name']}': {{\n")
            f.write(f"    pos: new THREE.Vector3({sx}, {sy}, {sz}),\n")
            f.write(f"    vel: new THREE.Vector3({svx}, {svy}, {svz})\n")
            f.write("  },\n")
        else:
            f.write(f"  // Failed to fetch {body['name']}\n")
        
        time.sleep(0.5)

    f.write("};\n")
