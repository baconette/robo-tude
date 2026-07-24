#!/bin/bash
# Generates prototypes.json locally for testing.
# Usage: ./generate-manifest.sh

cd "$(dirname "$0")"

echo "[" > prototypes.json
first=true

for dir in */; do
  dir="${dir%/}"

  [[ "$dir" == .* ]] && continue
  [[ "$dir" == "node_modules" ]] && continue

  [ -f "$dir/index.html" ] || continue

  # Get last commit date, fall back to newest file modification time for uncommitted folders
  last_updated=$(git log -1 --format="%aI" -- "$dir" 2>/dev/null)
  if [ -z "$last_updated" ]; then
    # Use the most recently modified file's timestamp (cross-platform via python3)
    last_updated=$(python3 -c "
import os, glob, datetime
files = glob.glob('$dir/**', recursive=True)
files = [f for f in files if os.path.isfile(f)]
if files:
    newest = max(os.path.getmtime(f) for f in files)
    print(datetime.datetime.fromtimestamp(newest, tz=datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+0000'))
else:
    print(datetime.datetime.now(tz=datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+0000'))
")
  fi

  # Derive name from folder name
  name=$(echo "$dir" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

  description=""
  tags="[]"
  thumbnail=""

  if [ -f "$dir/meta.json" ]; then
    description=$(python3 -c "import json; d=json.load(open('$dir/meta.json')); print(d.get('description',''))")
    tags=$(python3 -c "import json; d=json.load(open('$dir/meta.json')); print(json.dumps(d.get('tags',[])))")
    meta_name=$(python3 -c "import json; d=json.load(open('$dir/meta.json')); print(d.get('name',''))")
    [ -n "$meta_name" ] && name="$meta_name"
  fi

  # Use a per-prototype thumbnail if present; otherwise leave empty and the
  # viewer renders a built-in placeholder.
  if [ -f "$dir/thumbnail.png" ]; then
    thumbnail="$dir/thumbnail.png"
  elif [ -f "$dir/thumbnail.jpg" ]; then
    thumbnail="$dir/thumbnail.jpg"
  fi

  [ "$first" = true ] && first=false || echo "," >> prototypes.json

  python3 -c "
import json
print(json.dumps({
    'folder': '$dir',
    'name': '''$name''',
    'description': '''$description''',
    'tags': $tags,
    'thumbnail': '$thumbnail',
    'lastUpdated': '$last_updated'
}, indent=2))
" >> prototypes.json
done

echo "]" >> prototypes.json

echo "Generated prototypes.json with $(grep -c '"folder"' prototypes.json) prototype(s)."
