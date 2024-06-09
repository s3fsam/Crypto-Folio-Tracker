#!/bin/bash

# dont forget : apt-get install tree

# Vérifier si un répertoire est spécifié en argument
if [ $# -eq 0 ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi

# Vérifier si le répertoire existe
if [ ! -d "$1" ]; then
    echo "Le répertoire $1 n'existe pas."
    exit 1
fi

# Afficher l'arborescence complète du répertoire spécifié
tree "$1"
