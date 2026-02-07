#!/usr/bin/env python3
"""
Script robuste pour récupérer les documents PLU depuis une adresse
Gère les cas où plusieurs documents sont présents (PLUi, PSMV, etc.)
"""

import requests
import json
from typing import Optional, Dict, List

def geocoder_adresse(adresse: str) -> Optional[tuple]:
    """Convertit une adresse en coordonnées GPS"""
    print(f"🔍 Géocodage de: {adresse}")

    response = requests.get(
        "https://api-adresse.data.gouv.fr/search/",
        params={"q": adresse, "limit": 1}
    )

    if response.status_code == 200 and response.json()['features']:
        coords = response.json()['features'][0]['geometry']['coordinates']
        adresse_complete = response.json()['features'][0]['properties']['label']
        print(f"✅ Trouvée: {adresse_complete}")
        return coords[0], coords[1]  # longitude, latitude

    print("❌ Adresse non trouvée")
    return None

def trouver_documents(longitude: float, latitude: float) -> List[Dict]:
    """Trouve tous les documents d'urbanisme pour un point donné"""
    print(f"\n🔍 Recherche des documents pour ({latitude:.6f}, {longitude:.6f})")

    geom = {"type": "Point", "coordinates": [longitude, latitude]}

    response = requests.get(
        "https://apicarto.ign.fr/api/gpu/document",
        params={"geom": json.dumps(geom)},
        timeout=15
    )

    if response.status_code != 200:
        print(f"❌ Erreur API GPU: {response.status_code}")
        return []

    features = response.json().get('features', [])

    if not features:
        print("⚠️  Aucun document trouvé (commune probablement au RNU)")
        return []

    documents = []
    for feature in features:
        props = feature['properties']
        documents.append({
            'id': props.get('id'),
            'name': props.get('name'),
            'type': props.get('documentType'),
            'state': props.get('state'),
            'collectivite': props.get('collectiviteName'),
            'date_approbation': props.get('approbationDate')
        })

    print(f"\n📋 {len(documents)} document(s) trouvé(s):")
    for i, doc in enumerate(documents, 1):
        doc_type = doc['type'] or 'Type inconnu'
        print(f"  {i}. {doc['name']}")
        print(f"     Type: {doc_type}")
        print(f"     État: {doc['state']}")
        print(f"     Collectivité: {doc['collectivite']}")

    return documents

def selectionner_document_principal(documents: List[Dict]) -> Optional[Dict]:
    """Sélectionne le document principal (PLUi > PLU > autres)"""

    # Ordre de priorité
    priorite = ['PLUi', 'PLU', 'CC', 'POS', 'PSMV']

    for type_doc in priorite:
        for doc in documents:
            if doc['type'] == type_doc:
                return doc

    # Si aucun type connu, prendre le premier
    return documents[0] if documents else None

def recuperer_details(document_id: str) -> Optional[Dict]:
    """Récupère les détails complets d'un document"""
    print(f"\n📥 Récupération des détails du document...")

    response = requests.get(
        f"https://www.geoportail-urbanisme.gouv.fr/api/document/{document_id}/details",
        timeout=15
    )

    if response.status_code != 200:
        print(f"❌ Erreur {response.status_code}")
        return None

    try:
        details = response.json()

        # Vérifier que c'est bien un objet valide
        if not isinstance(details, dict) or 'name' not in details:
            print("⚠️  Document trouvé mais détails incomplets")
            return None

        print(f"✅ Détails récupérés pour: {details.get('name')}")

        nb_ecrits = len(details.get('writtenParts', []))
        nb_graphiques = len(details.get('graphicalParts', []))
        nb_annexes = len(details.get('annexes', []))

        print(f"   📄 {nb_ecrits} pièce(s) écrite(s)")
        print(f"   🗺️  {nb_graphiques} pièce(s) graphique(s)")
        print(f"   📎 {nb_annexes} annexe(s)")

        return details

    except json.JSONDecodeError:
        print("❌ Erreur de décodage JSON")
        return None

def afficher_pieces(details: Dict):
    """Affiche la liste des pièces disponibles"""

    print("\n" + "="*70)
    print("📋 PIÈCES DISPONIBLES")
    print("="*70)

    if details.get('writtenParts'):
        print("\n📄 Pièces écrites:")
        for i, piece in enumerate(details['writtenParts'], 1):
            print(f"  {i}. {piece.get('name')}")
            print(f"     URL: {piece.get('url')}")

    if details.get('graphicalParts'):
        print("\n🗺️  Pièces graphiques:")
        for i, piece in enumerate(details['graphicalParts'], 1):
            print(f"  {i}. {piece.get('name')}")
            print(f"     URL: {piece.get('url')}")

    if details.get('annexes'):
        print("\n📎 Annexes:")
        for i, annexe in enumerate(details['annexes'], 1):
            print(f"  {i}. {annexe.get('name')}")
            print(f"     URL: {annexe.get('url')}")

def telecharger_piece(url: str, nom_fichier: str) -> bool:
    """Télécharge une pièce"""
    try:
        print(f"📥 Téléchargement de {nom_fichier}...", end=" ")
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        with open(nom_fichier, 'wb') as f:
            f.write(response.content)

        taille = len(response.content) / 1024  # Ko
        print(f"✅ ({taille:.1f} Ko)")
        return True

    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    """Fonction principale"""
    print("="*70)
    print("🏛️  RÉCUPÉRATION DE DOCUMENTS PLU")
    print("="*70)

    # Exemple 1: À partir d'une adresse
    print("\n--- EXEMPLE 1: DEPUIS UNE ADRESSE ---")
    adresse = "1 place de la République, Nantes"

    coords = geocoder_adresse(adresse)
    if not coords:
        return

    longitude, latitude = coords

    # Trouver tous les documents
    documents = trouver_documents(longitude, latitude)
    if not documents:
        return

    # Sélectionner le document principal
    document = selectionner_document_principal(documents)
    if not document:
        print("❌ Impossible de sélectionner un document")
        return

    print(f"\n🎯 Document sélectionné: {document['name']} ({document['type']})")

    # Récupérer les détails
    details = recuperer_details(document['id'])
    if not details:
        print("\n⚠️  Le document existe mais les détails ne sont pas disponibles via l'API")
        print(f"Essayez de consulter directement: https://www.geoportail-urbanisme.gouv.fr/document/by-id/{document['id']}")
        return

    # Afficher les pièces
    afficher_pieces(details)

    # Exemple de téléchargement
    if details.get('writtenParts'):
        print("\n" + "="*70)
        print("📥 EXEMPLE DE TÉLÉCHARGEMENT")
        print("="*70)

        # Télécharger la première pièce écrite
        premiere_piece = details['writtenParts'][0]
        telecharger_piece(
            premiere_piece['url'],
            f"exemple_{premiere_piece['name']}"
        )

    print("\n" + "="*70)
    print("✅ TERMINÉ")
    print("="*70)

    # Afficher un résumé JSON
    print("\n💾 Résumé JSON:")
    resume = {
        'adresse': adresse,
        'coordonnees': {'latitude': latitude, 'longitude': longitude},
        'document': {
            'id': document['id'],
            'nom': document['name'],
            'type': document['type'],
            'collectivite': document['collectivite']
        },
        'nb_pieces_ecrites': len(details.get('writtenParts', [])),
        'nb_pieces_graphiques': len(details.get('graphicalParts', [])),
        'url_consultation': f"https://www.geoportail-urbanisme.gouv.fr/document/by-id/{document['id']}"
    }
    print(json.dumps(resume, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
