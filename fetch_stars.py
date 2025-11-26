import json
import math
import random

def generate_stars():
    print("Generating star data...")
    
    stars = []
    
    # Top 20 Brightest Stars (approximate J2000 coordinates)
    # RA (deg), Dec (deg), Vmag, B-V
    real_stars = [
        {"name": "Sun", "skip": True}, # Don't render Sun as a star
        {"name": "Sirius", "ra": 101.28, "dec": -16.71, "mag": -1.46, "bv": 0.00},
        {"name": "Canopus", "ra": 95.98, "dec": -52.69, "mag": -0.74, "bv": 0.15},
        {"name": "Rigil Kentaurus", "ra": 219.90, "dec": -60.83, "mag": -0.27, "bv": 0.71},
        {"name": "Arcturus", "ra": 213.91, "dec": 19.18, "mag": -0.05, "bv": 1.23},
        {"name": "Vega", "ra": 279.23, "dec": 38.78, "mag": 0.03, "bv": 0.00},
        {"name": "Capella", "ra": 79.17, "dec": 45.99, "mag": 0.08, "bv": 0.80},
        {"name": "Rigel", "ra": 78.63, "dec": -8.20, "mag": 0.13, "bv": -0.03},
        {"name": "Procyon", "ra": 114.82, "dec": 5.22, "mag": 0.34, "bv": 0.42},
        {"name": "Achernar", "ra": 24.42, "dec": -57.23, "mag": 0.46, "bv": -0.16},
        {"name": "Betelgeuse", "ra": 88.79, "dec": 7.40, "mag": 0.50, "bv": 1.85},
        {"name": "Hadar", "ra": 210.80, "dec": -60.37, "mag": 0.61, "bv": -0.23},
        {"name": "Altair", "ra": 297.69, "dec": 8.86, "mag": 0.76, "bv": 0.22},
        {"name": "Acrux", "ra": 186.64, "dec": -63.09, "mag": 0.77, "bv": -0.24},
        {"name": "Aldebaran", "ra": 68.98, "dec": 16.50, "mag": 0.86, "bv": 1.54},
        {"name": "Antares", "ra": 247.35, "dec": -26.43, "mag": 0.96, "bv": 1.83},
        {"name": "Spica", "ra": 201.29, "dec": -11.16, "mag": 0.97, "bv": -0.23},
        {"name": "Pollux", "ra": 116.32, "dec": 28.02, "mag": 1.14, "bv": 1.00},
        {"name": "Fomalhaut", "ra": 344.41, "dec": -29.62, "mag": 1.16, "bv": 0.09},
        {"name": "Deneb", "ra": 310.35, "dec": 45.28, "mag": 1.25, "bv": 0.09},
        {"name": "Mimosa", "ra": 191.93, "dec": -59.68, "mag": 1.25, "bv": -0.23}
    ]
    
    for s in real_stars:
        if s.get("skip"): continue
        
        ra_rad = math.radians(s["ra"])
        dec_rad = math.radians(s["dec"])
        
        # Convert to Cartesian (Y is North)
        x = math.cos(dec_rad) * math.cos(ra_rad)
        y = math.sin(dec_rad)
        z = -math.cos(dec_rad) * math.sin(ra_rad)
        
        stars.append({
            "pos": [x, y, z],
            "mag": s["mag"],
            "bv": s["bv"],
            "name": s["name"]
        })
        
    # Generate 3000 background stars
    # Magnitude distribution: N(m) ~ 10^(0.6m)
    # We want stars between mag 1.5 and 6.5
    
    for i in range(3000):
        # Random position on sphere
        theta = random.uniform(0, 2 * math.pi)
        phi = math.acos(2 * random.random() - 1)
        
        x = math.sin(phi) * math.cos(theta)
        y = math.sin(phi) * math.sin(theta) # This makes Y up/down? No, phi is from pole.
        # Wait, standard physics: z = r cos phi.
        # Let's stick to:
        # y = cos(phi) (Pole)
        # x = sin(phi) cos(theta)
        # z = sin(phi) sin(theta)
        
        y = math.cos(phi)
        x = math.sin(phi) * math.cos(theta)
        z = math.sin(phi) * math.sin(theta)
        
        # Magnitude: biased towards fainter stars
        # Simple approximation: mag = 1.5 + 5.0 * sqrt(random)
        mag = 1.5 + 5.0 * (random.random() ** 0.4)
        
        # Color (B-V): -0.3 (blue) to 1.8 (red)
        # Biased towards 0.5-1.0 (yellow/orange)
        bv = random.gauss(0.7, 0.4)
        
        stars.append({
            "pos": [x, y, z],
            "mag": mag,
            "bv": bv
        })
        
    print(f"Generated {len(stars)} stars.")
    
    with open('public/stars.json', 'w') as f:
        json.dump(stars, f)
        
    print("Saved to public/stars.json")

if __name__ == "__main__":
    generate_stars()
