import { readFileSync, writeFileSync } from "node:fs";

const path =
	"node_modules/three/src/renderers/webgpu/utils/WebGPUPipelineUtils.js";
let source = readFileSync(path, "utf8");
if (!source.includes("Below-About: propagate pipeline rejection")) {
	const before = `const p = new Promise( ( resolve /*, reject*/ ) => {\n\n\t\t\t\tdevice.createRenderPipelineAsync( pipelineDescriptor ).then( pipeline => {\n\n\t\t\t\t\tpipelineData.pipeline = pipeline;\n\t\t\t\t\tresolve();\n\n\t\t\t\t} );\n\n\t\t\t} );`;
	const after = `// Below-About: propagate pipeline rejection so the app can recover its renderer.\n\t\t\tconst p = new Promise( ( resolve, reject ) => {\n\n\t\t\t\tdevice.createRenderPipelineAsync( pipelineDescriptor ).then( pipeline => {\n\n\t\t\t\t\tpipelineData.pipeline = pipeline;\n\t\t\t\t\tresolve();\n\n\t\t\t\t}, reject );\n\n\t\t\t} );`;
	if (!source.includes(before))
		throw Error(
			"Three.js r180 pipeline patch no longer matches; inspect before upgrading.",
		);
	source = source.replace(before, after);
	writeFileSync(path, source);
}
