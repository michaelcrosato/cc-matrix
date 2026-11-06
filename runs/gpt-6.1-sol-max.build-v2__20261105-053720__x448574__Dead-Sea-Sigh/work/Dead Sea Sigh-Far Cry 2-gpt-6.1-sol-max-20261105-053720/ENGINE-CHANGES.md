# Engine patches
- World3D vehicle draw seam (line 3006): call `o.draw(pen, actor, time)` when supplied, so native physics vehicles can use original jeep, technical, truck and airboat models.
- Page compatibility prelude: provide standard WebGPU bit-flag constants only when missing, so three r182 can import its WebGL fallback in Firefox without WebGPU. No renderer or hardware API is emulated.
