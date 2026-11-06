# Vendored dependencies

- `my-3d2dge.js`: full my-3D2dge handoff v0.89.1, fetched from `michaelcrosato/my-3d2dge`, revision `8ecc2f62353761187bdfe226f327b7ea5d2eb691`. Unmodified source; MIT license in ENGINE-LICENSE. Documentation and inspected pointclick/adventure examples are retained in engine-docs/.
- `hub/`: official lib/hub README, client, bridge, round and harness from `michaelcrosato/ai-hub`, revision `35a1047f2067b2af3de3943f0fe452f39105d869`; session client1.4.0/protocol1. The client is byte-for-byte first script in the output. Separate license unknown; original notice retained.
- `peerjs.min.js`: PeerJS1.5.5 official distribution, MIT notice in PEERJS-LICENSE. Loaded inline without making a connection; instantiated only after standalone Host/Join.

No runtime solo dependencies are downloaded. Standalone rooms intentionally use the pinned client's secure PeerJS Cloud signaling and WebRTC. The game contains no audio files or raster artwork files.
