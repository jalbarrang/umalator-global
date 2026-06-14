# Race prediction models

These are room-winner ("favorite to win") prediction models used by the race-sim
favorites panel.

## Provenance

`cm14-room-model.json.gz` is sourced from **Hakuraku**
(https://github.com/SSHZ-ORG/hakuraku and https://hakuraku.moe), distributed under
the MIT License. The model predicts winner probabilities for a CM 3v3v3 room on
course `10602` (CM14). The runtime and feature builder under
`src/modules/race-sim/predictions/` are ported from the same project.

Each model is a gzipped JSON containing weight tensors plus the schema/normalization
metadata; the prediction runtime is plain JavaScript (a small deepsets MLP), not a
TensorFlow/ONNX graph.
