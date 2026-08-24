import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000/";
const outputRoot = resolve(process.argv[3] ?? ".artifacts/qa/layer-timing-2026-08-21");
const CDP_PORT = Number(process.env.CDP_PORT ?? 9333);
const viewports = [
  { name: "desktop-1440x900", width: 1440, height: 900, mobile: false },
  { name: "desktop-1920x1080", width: 1920, height: 1080, mobile: false },
  { name: "desktop-2560x1440", width: 2560, height: 1440, mobile: false },
  { name: "mobile-390x844", width: 390, height: 844, mobile: true },
  { name: "mobile-430x932", width: 430, height: 932, mobile: true },
];
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
mkdirSync(outputRoot, { recursive: true });

const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("No CDP page target");
const ws = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();
const consoleErrors = [];
const remoteResources = new Set();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const request = pending.get(message.id);
    if (message.error) request.reject(new Error(`${message.error.code}: ${message.error.message}`));
    else request.resolve(message.result);
    pending.delete(message.id);
  } else if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  } else if (message.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(message.params.type)) {
    consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
  } else if (message.method === "Network.requestWillBeSent") {
    const url = message.params.request.url;
    if (!url.startsWith("http://127.0.0.1:3000/") && !url.startsWith("data:") && !url.startsWith("blob:")) remoteResources.add(url);
  }
};
await new Promise((resolveOpen) => { ws.onopen = resolveOpen; });
const send = (method, params = {}) => new Promise((resolveSend, rejectSend) => {
  const id = ++sequence;
  pending.set(id, { resolve: resolveSend, reject: rejectSend });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result?.value;
};
const screenshot = async (path) => {
  const result = await send("Page.captureScreenshot", { format: "png" });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(result.data, "base64"));
};
const waitForExperience = async () => {
  for (let index = 0; index < 160; index++) {
    if (await evaluate("document.documentElement.dataset.experiencePhase === 'scroll'")) return;
    await sleep(250);
  }
  throw new Error("Experience did not enter scroll phase");
};

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: "history.scrollRestoration='manual';window.scrollTo(0,0);",
});

await send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url: baseUrl });
await sleep(1800);
await screenshot(resolve(outputRoot, "reduced-motion-390x844.png"));
const reducedFallback = await evaluate(`(async()=>{const root=document.documentElement;const fallback=document.getElementById('webgl-fallback');const answers=[...document.querySelectorAll('.faq .content-wrapper')];window.scrollTo({top:document.body.scrollHeight,behavior:'instant'});await new Promise(r=>setTimeout(r,80));document.getElementById('restart-btn')?.click();await new Promise(r=>setTimeout(r,80));return {isFallback:root.classList.contains('is-fallback')&&!fallback?.hidden,faqVisible:answers.length===5&&answers.every(answer=>answer.getBoundingClientRect().height>0),restartResets:window.scrollY===0};})()`);

const cases = [];
for (const viewport of viewports) {
  await send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  });
  await send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile, maxTouchPoints: 5 });
  await send("Page.navigate", { url: `${baseUrl}?seed=47&freeze=6#autostart` });
  await waitForExperience();
  await sleep(1400);
  const runtimeState = await evaluate(`(()=>{const state=window.__xp.experienceManager.runtimeState;return {phase:state.phase,assetProgress:state.assetProgress,assetsReady:state.assetsReady,scrollProgress:state.scrollProgress,activePoem:state.activePoem,activeScene:state.activeScene,landscapeScene:state.landscapeScene,performanceTier:state.performanceTier,error:state.error};})()`);
  const definitionContent = await evaluate(`(()=>{const definition=window.__xp.experienceDefinition;const poemNodes=[...document.querySelectorAll('.xp-text-w-inside .xp-text')];const questions=[...document.querySelectorAll('.faq .question')];const firstPoem=poemNodes[0]?.textContent??'';const model=definition.world.assets.model;const ground=definition.world.assets.groundAtlas;const modelResource=definition.assets.staticResources.find(item=>item.name==='watercolor/scene');const groundResource=definition.assets.staticResources.find(item=>item.name==='watercolor/ground');const rgbaNoiseResource=definition.assets.staticResources.find(item=>item.name==='noise/rgba-pixel');const scenes=definition.scenes;const papers=definition.world.papers;const atlas=definition.world.atlas;const atlasSdfNames=atlas.sdfEntries.map(entry=>entry[0]);const atlasTextureNames=atlas.textureEntries.map(entry=>entry[0]);const paperGroundCount=papers.filter(paper=>paper.hasGround).length;const paperLeavesCount=papers.filter(paper=>paper.leaves).length;const paperShadowCount=papers.filter(paper=>paper.castShadow).length;const paperHoleCount=papers.filter(paper=>paper.hasHole).length;const paperFadeCount=papers.filter(paper=>paper.revealType==='fade').length;const paperTitleCount=papers.filter(paper=>paper.title).length;const manager=window.__xp.experienceManager;const runtimeConfig=manager.runtimeContract;const treeSdf=atlas.sdfEntries.find(entry=>entry[0]==='tree_1')?.[1]?.atlasRemap;const treeTexture=atlas.textureEntries.find(entry=>entry[0]==='tree_1')?.[1]?.atlasRemap;return {loaderIntro:document.querySelector('.enter-description')?.textContent??'',expectedIntro:definition.copy.intro,poemCount:poemNodes.length,firstPoemHasSource:firstPoem.includes('You start')&&firstPoem.includes('painter'),tailHeading:document.querySelector('.advantages-header .a-title')?.textContent??'',expectedTailHeading:definition.tail.heading,faqCount:questions.length,substackParagraphs:questions[1]?.querySelectorAll('.answer p').length??0,awards:(document.querySelector('.awwards')?.textContent??'').includes('Awwwards'),fontFamily:definition.fonts.canelaThin.family,worldModel:model,worldGroundAtlas:ground,modelResourceBound:modelResource?.path===model,groundResourceBound:groundResource?.path===ground,rgbaNoiseResourceBound:rgbaNoiseResource?.path===definition.world.assets.rgbaNoise,basisPath:definition.world.assets.basisTranscoderPath,sceneLabels:scenes.map(scene=>scene.label),sceneTitles:scenes.map(scene=>scene.title),sceneFocusProgress:scenes.map(scene=>scene.focusProgress),runtimeSceneStarts:runtimeConfig?.sceneStarts??[],runtimePoemBreakpoints:runtimeConfig?.poemBreakpoints??[],runtimeCameraTailSeconds:runtimeConfig?.cameraTailSeconds??null,runtimeTravelMultiplier:runtimeConfig?.travelMultiplier??null,atlasSdfCount:atlas.sdfEntries.length,atlasTextureCount:atlas.textureEntries.length,atlasScheduleCount:Object.keys(atlas.layerSchedule).length,atlasPaperNamesMatch:papers.every(paper=>atlasSdfNames.includes(paper.name)&&atlasTextureNames.includes(paper.name)),atlasScheduleMatches:papers.every(paper=>atlas.layerSchedule[paper.name]===paper.startAt),atlasSdfTreeRemap:treeSdf?{x:treeSdf.x,y:treeSdf.y,z:treeSdf.z,w:treeSdf.w}:null,atlasTextureTreeRemap:treeTexture?{x:treeTexture.x,y:treeTexture.y,z:treeTexture.z,w:treeTexture.w}:null,paperManifestCount:papers.length,paperGroundCount,paperLeavesCount,paperShadowCount,paperHoleCount,paperFadeCount,paperTitleCount,paperManifestContract:papers.every(paper=>typeof paper.name==='string'&&typeof paper.startAt==='number'&&typeof paper.sceneIndex==='number'&&typeof paper.ground?.depth==='number'&&typeof paper.sdf?.min==='number'&&typeof paper.castShadow==='boolean'&&typeof paper.hasHole==='boolean'&&typeof paper.hasGround==='boolean'&&typeof paper.hasHoverEffect==='boolean'&&['default','fade'].includes(paper.revealType))};})()`);
  const paperLayerState = await evaluate(`(()=>{const definition=window.__xp.experienceDefinition;const papers=definition.world.papers;const layers=definition.world.paperLayers;const aligned=layers.ground.every((entry,index)=>entry.index===index&&entry.name===papers[index]?.name&&entry.startAt===papers[index]?.startAt&&entry.sceneIndex===papers[index]?.sceneIndex)&&layers.sdf.every((entry,index)=>entry.index===index&&entry.name===papers[index]?.name)&&layers.vegetation.every((entry,index)=>entry.index===index&&entry.name===papers[index]?.name)&&layers.shadow.every((entry,index)=>entry.index===index&&entry.name===papers[index]?.name);return {groundCount:layers.ground.length,groundEnabledCount:layers.ground.filter(entry=>entry.hasGround).length,sdfCount:layers.sdf.length,sdfFadeCount:layers.sdf.filter(entry=>entry.revealType==='fade').length,sdfTransparentCount:layers.sdf.filter(entry=>entry.transparency).length,vegetationCount:layers.vegetation.length,vegetationLeavesCount:layers.vegetation.filter(entry=>entry.leaves).length,shadowCount:layers.shadow.length,shadowCastCount:layers.shadow.filter(entry=>entry.castShadow).length,shadowHoleCount:layers.shadow.filter(entry=>entry.hasHole).length,aligned,sdfContract:layers.sdf.every(entry=>typeof entry.sdf?.min==='number'&&['default','fade'].includes(entry.revealType)&&typeof entry.transparency==='boolean'),vegetationContract:layers.vegetation.every(entry=>typeof entry.hasHoverEffect==='boolean'),shadowContract:layers.shadow.every(entry=>typeof entry.castShadow==='boolean'&&typeof entry.hasHole==='boolean'),groundContract:layers.ground.every(entry=>typeof entry.hasGround==='boolean'&&typeof entry.ground?.depth==='number')};})()`);
  const caseDir = resolve(outputRoot, viewport.name);
  const layerState = await evaluate(`(()=>{const manager=window.__xp.experienceManager;const view=manager._watercolorView;const papers=view.papers;const regions=[...manager._simulation._regions.values()];const fullPaintRegion=regions.find(region=>region.paperIndex===manager._simulation.fullPaintPaperIndex);let overlaps=0;for(let i=0;i<regions.length;i++)for(let j=i+1;j<regions.length;j++){const a=regions[i],b=regions[j];if(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y)overlaps++;}const paperYawAlignment=Math.max(...papers.map(p=>{const q=p.mesh.getWorldQuaternion(p.mesh.quaternion.clone());const worldYaw=Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z));return Math.abs(p.transform.rotation.y+worldYaw);}));const cutout=view.cutoutShadow;const cutoutMaterial=cutout?._material;const cutoutGeometry=cutout?._mesh?.geometry;const ground=view._groundMesh;const groundMaterial=view._groundMaterial;const groundGeometry=ground?.geometry;const groundUniforms=groundMaterial?.uniforms;return {paperCount:papers.length,premature:papers.filter(p=>p.config.startAt>0&&(p.revealed||Math.abs(p.state.rotationZ+Math.PI/2)>.001)).length,completeLayerBaseline:view._paperMaterial?.uniforms.uCompleteLayerBaseline?.value??0,revealTiming:view.getRevealTiming?.()??null,titleCount:view.paintingTitles.configs.length,simulationRegions:regions.length,simulationAtlasSize:manager._simulation.atlasSize,simulationUniqueSizes:new Set(regions.map(r=>r.width+'x'+r.height)).size,simulationOverlaps:overlaps,fullPaintRegion:fullPaintRegion?{width:fullPaintRegion.width,height:fullPaintRegion.height,ratio:fullPaintRegion.ratio}:null,grassPatches:view.grassLayer.configs.length,grassBounds:view.grassLayer._patches[0]?.mesh.geometry.boundingSphere?.radius??0,paperYawAlignment,shadowSources:view.shadowProjection._sources.length,shadowTexture:view.shadowProjection.texture.name,groundBatch:!!ground&&ground.count===papers.length&&ground.name==='SourceGroundsBatch',groundBatchAttributes:!!groundGeometry?.getAttribute?.('instance')&&!!groundGeometry?.getAttribute?.('size')&&!!groundGeometry?.getAttribute?.('simulationBox')&&!!groundGeometry?.getAttribute?.('simulationRemap'),groundBatchUniforms:!!groundUniforms?.uVisible&&!!groundUniforms?.uAlpha&&Array.isArray(groundUniforms?.uAtlasRemap?.value),cutoutShadowSources:cutout?._sources.length??0,cutoutShadowMesh:!!cutout?._mesh,cutoutShadowAttributes:!!cutoutGeometry?.getAttribute?.('aSdfAtlasRemap')&&!!cutoutGeometry?.getAttribute?.('aSdfScale')&&!!cutoutGeometry?.getAttribute?.('aAlpha'),cutoutShadowShader:!!cutoutMaterial?.fragmentShader?.includes('uShadowMap')&&!!cutoutMaterial?.fragmentShader?.includes('uCutoutShadowIntensity'),cutoutShadowUniforms:!!cutoutMaterial?.uniforms?.uShadowMap&&!!cutoutMaterial?.uniforms?.uSdfTexture};})()`);
  const cursorState = await evaluate(`(async()=>{const root=document.getElementById('cursor');if(!root||${viewport.mobile})return {enabled:false};window.dispatchEvent(new MouseEvent('mousemove',{clientX:${viewport.width / 2},clientY:${viewport.height / 2},bubbles:true}));await new Promise(resolveCursor=>setTimeout(resolveCursor,120));const out=root.querySelector('.out-circle');const inner=root.querySelector('.in-circle');const style=out?getComputedStyle(out):null;const rect=out?.getBoundingClientRect();return {enabled:true,active:root.classList.contains('active'),circleSize:rect?.width??0,fullRing:style?.fill==='none'&&style?.strokeDasharray==='none'&&style?.strokeDashoffset==='0px'&&style?.strokeWidth!=='0px',overflow:out?getComputedStyle(out.parentElement).overflow:null,innerDot:!!inner&&getComputedStyle(inner).fill!=='none'};})()`);
  const cameraState = await evaluate(`(()=>{const camera=window.__xp.experienceManager._watercolorView.scrollCamera;return camera.getDebugState?.()??null;})()`);
  const leavesState = await evaluate(`(()=>{const layer=window.__xp.experienceManager._watercolorView.leavesLayer;return layer?.getDebugState?.()??null;})()`);
  const fullPaintLifecycle = await evaluate(`(()=>{const manager=window.__xp.experienceManager;const simulation=manager._simulation;const fullPaint=manager._fullPaintManager;const vector=manager._paintManager._client.constructor;const paperIndex=simulation.fullPaintPaperIndex;const center=new vector(.5,.5);simulation.resetFullPaint(1);simulation.splatScene(1,center,new vector(.12,0),1.1);for(let i=0;i<3;i++){simulation.setFullPaintActive(true,false);simulation.update(1/60);}const painted=simulation.readAccumulation(paperIndex,center);simulation.resetFullPaint(1);const cleared=simulation.readAccumulation(paperIndex,center);const progress=fullPaint._material.uniforms.uVisibleProgress;const original=progress.value;progress.value=.7;const belowThreshold=!fullPaint.isVisible;progress.value=.9;const aboveThreshold=fullPaint.isVisible;progress.value=original;return {paperIndex,painted,cleared,visibleThreshold:belowThreshold&&aboveThreshold};})()`);
  const uvMapping = await evaluate(`(()=>{const view=window.__xp.experienceManager._watercolorView;const paperBox=view.getPaperSimulationBox(0);const paper=view.mapHitUvToSimulation({kind:'paper',paperIndex:0,uv:{x:.2,y:.4}});const ground=view.mapHitUvToSimulation({kind:'ground',paperIndex:0,uv:{x:.2,y:.4}});const normalizeX=value=>(value-paperBox.x)/Math.max(paperBox.z-paperBox.x,.0001);return {paperNormalizedX:normalizeX(paper.x),groundNormalizedX:(ground.x-view._groundSimulationBoxes.get(0).x)/Math.max(view._groundSimulationBoxes.get(0).z-view._groundSimulationBoxes.get(0).x,.0001)};})()`);
  const scrollStep = await evaluate(`(async()=>{window.__xp.scrollController.scrollToTop();await new Promise(requestAnimationFrame);const before=window.__xp.scrollController.sample.cameraTime;const sample=window.__xp.scrollController.sample;const camera=window.__xp.experienceManager._watercolorView.scrollCamera;const definition=window.__xp.experienceDefinition;const expectedAdvance=100/(sample.contentHeight*sample.travelMultiplier)*(camera.duration-definition.runtime.cameraTailSeconds);window.scrollTo({top:100,behavior:'instant'});await new Promise(r=>setTimeout(r,250));const after=window.__xp.scrollController.sample.cameraTime;window.__xp.scrollController.scrollToTop();return {before,after,advance:after-before,expectedAdvance};})()`);
  await screenshot(resolve(caseDir, "00-start.png"));

  const layerDurations = await evaluate(`(()=>{const view=window.__xp.experienceManager._watercolorView;const paper=view.papers.find(entry=>!entry.revealed&&entry.config.startAt>0);if(!paper)return null;view._reveal(paper);const tweens=paper.tween.getChildren(true,true,false);const result={rise:tweens.find(tween=>tween.vars.rotationZ===0)?.duration()??null,curve:tweens.find(tween=>tween.vars.curve===1)?.duration()??null,reveal:tweens.find(tween=>tween.vars.reveal===15)?.duration()??null};paper.tween.kill();view.hideAll();const fade=view.papers.find(entry=>entry.config.revealType==='fade');view._reveal(fade);const fadeTweens=fade.tween.getChildren(true,true,false);const fadeResult={rotationZ:fade.state.rotationZ,curve:fade.state.curve,alphaDuration:fadeTweens.find(tween=>tween.vars.alpha===1)?.duration()??null,hasRise:fadeTweens.some(tween=>tween.vars.rotationZ===0&&tween.duration()>0.1)};fade.tween.kill();view.hideAll();return {...result,fade:fadeResult};})()`);
  const groundLifecycle = await evaluate(`(()=>{const view=window.__xp.experienceManager._watercolorView;const ground=view._grounds[0];const paper=ground&&view.papers[ground.paperIndex];const batch=view._groundMesh;const material=view._groundMaterial;if(!ground||!paper||!batch||!material)return null;const initial=material.uniforms.uAlpha.value[ground.paperIndex];view._reveal(paper);const tweens=paper.tween.getChildren(true,true,false);const result={initial,batchCount:batch.count,visible:material.uniforms.uVisible.value[ground.paperIndex],alphaDuration:tweens.find(tween=>tween.vars.uAlpha===1)?.duration()??null};paper.tween.kill();view.hideAll();return result;})()`);
  const cutoutLifecycle = await evaluate(`(async()=>{const view=window.__xp.experienceManager._watercolorView;const layer=view.cutoutShadow;const source=layer?._sources[0];if(!layer||!source)return null;const index=layer._sources.indexOf(source);const read=()=>layer._alphaStates[index]?.value??null;const initial=read();layer.show(source.paperIndex);await new Promise(r=>setTimeout(r,200));const mid=read();await new Promise(r=>setTimeout(r,300));const done=read();layer.reset();return {initial,mid,done};})()`);
  const renderResolution = await evaluate(`(()=>{const view=window.__xp.experienceManager._watercolorView;const paper=view._paperMaterial?.uniforms.uResolution?.value;const ground=view._groundMaterial?.uniforms.uResolution?.value;const canvas=document.querySelector('#xp-canvas');return {canvas:[canvas?.width??0,canvas?.height??0],paper:paper?[paper.x,paper.y]:null,ground:ground?[ground.x,ground.y]:null};})()`);
  const sourceMaterialState = await evaluate(`(()=>{const u=window.__xp.experienceManager._watercolorView._paperMaterial?.uniforms;const l=u?.uLighting?.value;const b=u?.uBackground?.value;return {lighting:l?{groundScale:[l.groundSpecularScale.x,l.groundSpecularScale.y],groundOffset:[l.groundSpecularOffset.x,l.groundSpecularOffset.y],groundStrength:l.groundSpecularStrength,specularCenter:[l.specularCenter.x,l.specularCenter.y],specularScale:[l.specularScale.x,l.specularScale.y],specularStrength:l.specularStrength}:null,background:b?{ground:b.groundColor.getHexString(),sky:b.skyColor.getHexString(),progress:[b.progressRemap.x,b.progressRemap.y]}:null};})()`);
  const backgroundCompositeState = await evaluate(`(()=>{const p=window.__xp.experienceManager._watercolorView.shadowProjection;const u=p?._compositeMaterial?.uniforms;const value=name=>u?.[name]?.value;return {noise:!!value('tNoiseTexture'),projectionInverse:value('uProjectionInverse')?.elements?.length??0,viewInverse:value('uViewMatrixInv')?.elements?.length??0,view:value('uViewMatrix')?.elements?.length??0,resolution:value('uResolution')?[value('uResolution').x,value('uResolution').y]:null,fog:value('uFogState')?[value('uFogState').x,value('uFogState').y]:null,shadowUniform:!!u?.uShadowMap};})()`);
  const globalGroundState = await evaluate(`(()=>{const layer=window.__xp.experienceManager._watercolorView.globalGround;const mesh=layer?._mesh;const material=layer?._material;const u=material?.uniforms;const shader=material?.fragmentShader??'';const value=name=>u?.[name]?.value;return {mesh:!!mesh,renderOrder:mesh?.renderOrder??null,receiveShadow:!!mesh?.receiveShadow,plane:[mesh?.geometry?.parameters?.width??0,mesh?.geometry?.parameters?.height??0],shader:shader.includes('uShadowMap')&&shader.includes('uShadowStrength')&&shader.includes('groundSpecularVector')&&shader.includes('computeBackground'),shadowUniform:!!u?.uShadowMap,shadowStrength:value('uShadowStrength')??0,lightingUniform:!!u?.uLighting,backgroundUniform:!!u?.uBackground,noise:!!value('tNoiseTexture'),resolution:value('uResolution')?[value('uResolution').x,value('uResolution').y]:null,fog:value('uFogState')?[value('uFogState').x,value('uFogState').y]:null};})()`);
  const fluidPassState = await evaluate(`(()=>{const manager=window.__xp.experienceManager;const simulation=manager._simulation;const divergence=simulation?._divergenceMat?.fragmentShader??'';const advection=simulation?._advect?.fragmentShader??'';const splat=simulation?._splat?.fragmentShader??'';const fullPaintShader=manager._fullPaintManager?._material?.fragmentShader??'';const states=[...(simulation?._states?.values?.()??[])];const dtScaling=states.length>0&&states.every(state=>Math.abs(state.dt-.008*state.fboSize.x/simulation.atlasSize)<.000001);return {divergenceUsesDt:divergence.includes('* 0.5 / max(vDt, 0.000001)'),divergenceUsesSingleCell:!divergence.includes('uTexelSize.x * 2.0')&&!divergence.includes('uTexelSize.y * 2.0'),advectionUsesV2:advection.includes('spotOld2')&&advection.includes('spotNew3')&&advection.includes('noise2.r * 3.0')&&advection.includes('vDt * ratio'),splatUsesSourceEllipse:splat.includes('sdEllipse')&&splat.includes('uCurrentRadius')&&splat.includes('vWasActive < 0.5')&&!splat.includes('sdUnevenCapsule'),dtScaling,fullPaintSourceAlpha:fullPaintShader.includes('gl_FragColor = inkColor;')&&!fullPaintShader.includes('inkColor.a * uAlpha')};})()`);
  const fluidStencilState = await evaluate(`(()=>{const simulation=window.__xp.experienceManager._simulation;const geometry=simulation?._mesh?.geometry;const states=[...(simulation?._states?.values?.()??[])];return {stencilTargets:[simulation?._velocityA,simulation?._velocityB,simulation?._pressureA,simulation?._pressureB,simulation?._divergence,simulation?._accumulationA,simulation?._accumulationB].every(target=>target?.stencilBuffer===true),stencilMesh:!!simulation?._stencilMesh,stencilActiveAttribute:!!geometry?.getAttribute?.('aStencilActive'),fourFrameHistory:states.length>0&&states.every(state=>['wasActive','wasActive2','wasActive3','wasActive4'].every(key=>typeof state[key]==='boolean'))};})()`);
  const fluidActivityState = await evaluate(`(()=>{const simulation=window.__xp.experienceManager._simulation;const state=simulation?._states?.get?.(0);if(!state)return null;simulation.reset();simulation.markActive(0,false);const marked=state.active;simulation._activeUntil.set(0,performance.now()-1);simulation.update(1/60);const expired=!state.active;simulation.setFullPaintActive(true,false);const full=simulation._states.get(simulation.fullPaintPaperIndex);const fullActive=!!full?.active;const ordinarySuppressed=[...simulation._states.values()].filter(entry=>entry.paperIndex!==simulation.fullPaintPaperIndex).every(entry=>!entry.active);simulation.setFullPaintActive(false);simulation.reset();return {marked,expired,fullActive,ordinarySuppressed};})()`);
  const idleHoverState = await evaluate(`(async()=>{const simulation=window.__xp.experienceManager._simulation;const paint=window.__xp.experienceManager._paintManager;simulation.reset();let movementCalls=0;let idleCalls=0;let idlePhase=false;const original=simulation.markActive.bind(simulation);simulation.markActive=(paperIndex,pressed)=>{if(idlePhase)idleCalls++;else movementCalls++;return original(paperIndex,pressed)};try{const y=${viewport.height}*.48;const x0=${viewport.width}*.23;const x1=${viewport.width}*.60;window.dispatchEvent(new PointerEvent('pointermove',{clientX:x0,clientY:y,pointerType:'mouse',bubbles:true}));await new Promise(r=>setTimeout(r,180));window.dispatchEvent(new PointerEvent('pointermove',{clientX:x1,clientY:y,pointerType:'mouse',bubbles:true}));await new Promise(r=>setTimeout(r,850));idlePhase=true;await new Promise(r=>setTimeout(r,500));return {movementCalls,idleCalls,brushSample:!!paint.lastBrushSample,idleDoesNotRefresh:idleCalls===0};}finally{simulation.markActive=original;simulation.reset();}})()`);

  const scrollResponse = await evaluate(`(async()=>{const samples=[];window.__xp.scrollController.scrollToCameraTime(24);for(let i=0;i<22;i++){await new Promise(requestAnimationFrame);const s=window.__xp.scrollController.sample;samples.push({t:performance.now(),raw:s.rawProgress,damped:s.dampedProgress});}const runtime=window.__xp.experienceManager.runtimeState;const runtimeAt24={activePoem:runtime.activePoem,activeScene:runtime.activeScene,scrollProgress:runtime.scrollProgress};window.__xp.scrollController.scrollToTop();await new Promise(r=>setTimeout(r,450));return {samples,maxLag:Math.max(...samples.map(s=>Math.abs(s.raw-s.damped))),firstFrameMoved:samples.findIndex(s=>s.damped>0),settledLag:Math.abs(samples.at(-1).raw-samples.at(-1).damped),runtimeAt24};})()`);

  let rippleScene = null;
  let smallBrushSample = null;
  let largeBrushSample = null;
  if (!viewport.mobile) {
    smallBrushSample = await evaluate(`(async()=>{const x=${viewport.width}*.43,y=${viewport.height}*.48;window.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,pointerType:'mouse',bubbles:true}));await new Promise(r=>setTimeout(r,700));window.dispatchEvent(new PointerEvent('pointermove',{clientX:x+1,clientY:y,pointerType:'mouse',bubbles:true}));await new Promise(r=>setTimeout(r,17));window.dispatchEvent(new PointerEvent('pointermove',{clientX:x+2,clientY:y+1,pointerType:'mouse',bubbles:true}));await new Promise(requestAnimationFrame);const s=window.__xp.experienceManager._paintManager.lastBrushSample;return s?{paperIndex:s.paperIndex,sourceScale:s.sourceScale,normalizedSpeed:s.normalizedSpeed,visibleDiameter:s.visibleDiameter}:null;})()`);
    await screenshot(resolve(caseDir, "01-small-ripple.png"));
    const largeResult = await evaluate(`(async()=>{const manager=window.__xp.experienceManager;const simulation=manager._simulation;const originalSplat=simulation.splat.bind(simulation);let peak=null;simulation.splat=sample=>{if(!peak||sample.sourceScale>peak.sourceScale)peak={paperIndex:sample.paperIndex,sourceScale:sample.sourceScale,normalizedSpeed:sample.normalizedSpeed,visibleDiameter:sample.visibleDiameter};return originalSplat(sample);};try{const x0=${viewport.width}*.23,x1=${viewport.width}*.60,y=${viewport.height}*.48;window.dispatchEvent(new PointerEvent('pointermove',{clientX:x0,clientY:y,pointerType:'mouse',bubbles:true}));await new Promise(r=>setTimeout(r,700));for(let i=1;i<=3;i++){if(i>1)await new Promise(r=>setTimeout(r,17));const x=x0+(x1-x0)*(i/3);window.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,pointerType:'mouse',bubbles:true}));await new Promise(requestAnimationFrame);}await new Promise(requestAnimationFrame);return {sceneIndex:manager._paintManager.sceneIndex,sample:peak};}finally{simulation.splat=originalSplat;}})()`);
    rippleScene = largeResult.sceneIndex;
    largeBrushSample = largeResult.sample;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    await screenshot(resolve(caseDir, "02-large-ripple.png"));
  }
  const brushSample = await evaluate(`(()=>{const manager=window.__xp.experienceManager;const s=manager._paintManager.lastBrushSample;if(!s)return null;const box=manager._watercolorView.getPaperSimulationBox(s.paperIndex);const fullWidth=s.projectedSize.x/Math.max(box.z-box.x,.0001);const fullHeight=s.projectedSize.y/Math.max(box.w-box.y,.0001);const diameterX=s.currentRadius.x*fullWidth*2;const diameterY=s.currentRadius.y*fullHeight*2;const accumulation=manager._simulation.readAccumulation(s.paperIndex,s.currentUv);return {paperIndex:s.paperIndex,visibleDiameter:s.visibleDiameter,diameterX,diameterY,aspectRatio:Math.max(diameterX,diameterY)/Math.max(Math.min(diameterX,diameterY),.0001),projectedSize:s.projectedSize,simulationSize:s.simulationSize,pressed:s.pressed,accumulation};})()`);

  let brushSlowMotion = null;
  let brushMotion = null;
  if (!viewport.mobile && viewport.width === 1440) {
    brushSlowMotion = await evaluate(`(async()=>{const manager=window.__xp.experienceManager;const simulation=manager._simulation;const base=manager._paintManager.lastBrushSample;if(!base)return null;const center=base.currentUv.clone().set(.5,.5);const makeRadius=diameter=>base.currentRadius.clone().multiplyScalar(diameter/Math.max(base.visibleDiameter,.0001));simulation.reset();let previous=center.clone().add(base.velocity.clone().set(-.16,0));let previousRadius=makeRadius(95*.2);const samples=[];for(let step=0;step<=10;step++){const t=step/10;const current=center.clone().add(base.velocity.clone().set(-.16+.32*t,0));const sourceScale=.2+1.6*t;const diameter=95*sourceScale;const currentRadius=makeRadius(diameter);simulation.splat({...base,previousUv:previous.clone(),currentUv:current.clone(),ndcVelocity:base.ndcVelocity.clone().set(.008,0),normalizedSpeed:.008,sourceScale,previousRadius:previousRadius.clone(),currentRadius:currentRadius.clone(),visibleDiameter:diameter,velocity:current.clone().sub(previous),pressed:false,intensity:.06});await new Promise(r=>setTimeout(r,50));samples.push({step,t,sourceScale,pigment:simulation.readAccumulation(base.paperIndex,current).pigment});previous=current;previousRadius=currentRadius;}const quarter=center.clone().add(base.velocity.clone().set(-.08,0));const midpoint=center.clone();const threeQuarter=center.clone().add(base.velocity.clone().set(.08,0));return {timeScale:.1,steps:samples.length,first:samples[0],last:samples.at(-1),continuity:[quarter,midpoint,threeQuarter].map(uv=>simulation.readAccumulation(base.paperIndex,uv).pigment)};})()`);
    await screenshot(resolve(caseDir, "03-slow-brush.png"));
    await evaluate(`(()=>{const paint=window.__xp.experienceManager._paintManager;const original=paint.update;paint.update=()=>{};window.__qaRestorePaintManager=()=>{paint.update=original;delete window.__qaRestorePaintManager;};return true;})()`);
    brushMotion = await evaluate(`(async()=>{const manager=window.__xp.experienceManager;const simulation=manager._simulation;const base=manager._paintManager.lastBrushSample;if(!base)return null;const waitFrames=async count=>{for(let i=0;i<count;i++)await new Promise(requestAnimationFrame);};const makeRadius=diameter=>base.currentRadius.clone().multiplyScalar(diameter/Math.max(base.visibleDiameter,.0001));const center=base.currentUv.clone().set(.5,.5);const smallDiameter=95*.2;const smallRadius=makeRadius(smallDiameter);simulation.reset();simulation.splat({...base,previousUv:center.clone(),currentUv:center.clone(),ndcVelocity:base.ndcVelocity.clone().set(.0001,0),normalizedSpeed:0,sourceScale:.2,previousRadius:smallRadius.clone(),currentRadius:smallRadius.clone(),visibleDiameter:smallDiameter,velocity:base.velocity.clone().set(0,0),pressed:false,intensity:.06});await waitFrames(3);const smallCenter=simulation.readAccumulation(base.paperIndex,center);const smallOutsideUv=center.clone().add(base.velocity.clone().set(smallRadius.x*1.35,0));const smallOutside=simulation.readAccumulation(base.paperIndex,smallOutsideUv);const largeDiameter=95*1.8;const largeRadius=makeRadius(largeDiameter);const previous=center.clone().add(base.velocity.clone().set(-.16,0));const current=center.clone().add(base.velocity.clone().set(.16,0));const midpoint=previous.clone().lerp(current,.5);simulation.reset();simulation.splat({...base,previousUv:previous,currentUv:current,ndcVelocity:base.ndcVelocity.clone().set(.08,0),normalizedSpeed:.08,sourceScale:1.8,previousRadius:largeRadius.clone(),currentRadius:largeRadius.clone(),visibleDiameter:largeDiameter,velocity:current.clone().sub(previous),pressed:false,intensity:.06});await waitFrames(3);const immediate={previous:simulation.readAccumulation(base.paperIndex,previous),midpoint:simulation.readAccumulation(base.paperIndex,midpoint),current:simulation.readAccumulation(base.paperIndex,current)};simulation._activeUntil.set(base.paperIndex,Number.POSITIVE_INFINITY);simulation._markedActiveThisFrame.delete(base.paperIndex);const decay=[{time:0,value:immediate.current.wetness}];for(const time of [1,2,3]){if(time===3){simulation._activeUntil.set(base.paperIndex,performance.now()-1);const expiredState=simulation._states.get(base.paperIndex);if(expiredState)expiredState.active=false;}for(let frame=0;frame<60;frame++)simulation.update(1/60);decay.push({time,value:simulation.readAccumulation(base.paperIndex,current).wetness});}return {small:{diameter:smallDiameter,ringDiameter:95,center:smallCenter,outside:smallOutside},large:{diameter:largeDiameter,ringDiameter:95,rangeRatio:largeDiameter/95,immediate},decay};})()`);
    await evaluate(`(()=>{window.__qaRestorePaintManager?.();return true;})()`);
    await screenshot(resolve(caseDir, "04-brush-decay.png"));
  }

  const grassLifecycle = viewport.mobile ? null : await evaluate(`(async()=>{const layer=window.__xp.experienceManager._watercolorView.grassLayer;const patch=layer._patches[0];if(!patch)return null;patch.mesh.updateWorldMatrix(true,false);const local=patch.config.positions;const world=patch.mesh.matrixWorld.elements;const x=world[0]*local[0]+world[4]*local[1]+world[8]*local[2]+world[12];const y=world[1]*local[0]+world[5]*local[1]+world[9]*local[2]+world[13];const z=world[2]*local[0]+world[6]*local[1]+world[10]*local[2]+world[14];const point={x,y,z,clone(){return {...this,clone:this.clone}}};const start=performance.now();const probeDuration=innerWidth>=2400?4000:1600;let risen=0;while(performance.now()-start<probeDuration){layer.setGroundHit(patch.config.paperIndex,point);risen=Math.max(risen,...patch.config.reveal);await new Promise(requestAnimationFrame);}await new Promise(r=>setTimeout(r,3200));const fallen=Math.max(...patch.config.reveal);return {risen,fallen,probeDuration};})()`);
  const leavesLifecycle = viewport.mobile ? null : await evaluate(`(()=>{const state=window.__xp.experienceManager._watercolorView.leavesLayer?.getDebugState?.();return {lastIndex:state?.lastIndex??-1,activePaperIndex:state?.activePaperIndex??null};})()`);

  let slowMotion = null;
  if (!viewport.mobile && viewport.width === 1440) {
    slowMotion = await evaluate(`(async()=>{const view=window.__xp.experienceManager._watercolorView;view.hideAll();const paper=view.papers[0];view._reveal(paper);paper.tween.timeScale(.1).pause().seek(1.5);await new Promise(requestAnimationFrame);const revealProgress=paper.state.reveal;const timeline=Math.max(0,Math.min(1,revealProgress/15));const edgeEnd=1-.5/7;const linear=Math.max(0,Math.min(1,(timeline-.18)/(edgeEnd-.18)));const revealCompletion=1-(1-linear)*(1-linear);return {paper:paper.config.name,timeScale:paper.tween.timeScale(),seekTime:1.5,rotationZ:paper.state.rotationZ,complete:paper.state.rotationZ===0,revealProgress,revealCompletion,edgeCatchup:{endTime:edgeEnd*7,before:(()=>{const t=(6.4/7-.18)/(edgeEnd-.18);return 1-(1-Math.max(0,Math.min(1,t)))**2})(),at:(()=>{const t=(6.5/7-.18)/(edgeEnd-.18);return 1-(1-Math.max(0,Math.min(1,t)))**2})(),after:(()=>{const t=(6.6/7-.18)/(edgeEnd-.18);return 1-(1-Math.max(0,Math.min(1,t)))**2})()}};})()`);
    await screenshot(resolve(caseDir, "05-layer-slow-motion.png"));
    await evaluate(`(()=>{const paper=window.__xp.experienceManager._watercolorView.papers[0];paper.tween.pause().seek(6.5);})()`);
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    await screenshot(resolve(caseDir, "06-layer-edge-catchup.png"));
    await evaluate(`(()=>{const view=window.__xp.experienceManager._watercolorView;view.papers.forEach(paper=>paper.tween?.kill());view.hideAll();})()`);
  }

  const timings = [];
  for (const time of [8, 24, 44, 55]) {
    await evaluate(`window.__xp.scrollController.scrollToCameraTime(${time})`);
    await sleep(1100);
    timings.push(await evaluate(`(()=>{const sample=window.__xp.scrollController.sample;const visibleTitles=window.__xp.experienceManager._watercolorView.paintingTitles._items.filter(item=>item.alpha>.1).length;return {sample,visibleTitles};})()`));
    await screenshot(resolve(caseDir, `${String(time).padStart(2, "0")}-camera.png`));
  }

  const titleClick = await evaluate(`(async()=>{const manager=window.__xp.experienceManager;const item=manager._watercolorView.paintingTitles._items.find(entry=>entry.alpha>.8);if(!item)return {available:false};const b=item.config.interactionBounds;const x=(b.min.x+b.max.x)/2;const y=(b.min.y+b.max.y)/2;const pointerType=${viewport.mobile ? "'touch'" : "'mouse'"};window.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,pointerType,bubbles:true}));await new Promise(requestAnimationFrame);window.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerType,bubbles:true}));await new Promise(r=>setTimeout(r,40));window.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerType,bubbles:true}));await new Promise(r=>setTimeout(r,900));const result={available:true,expected:item.config.sceneIndex,visible:manager._fullPaintManager.isVisible,sceneIndex:manager._fullPaintManager.sceneIndex};manager._fullPaintManager.hide();return result;})()`);
  await sleep(500);

  await evaluate("window.__xp.scrollController.scrollToCameraTime(24)");
  await sleep(900);
  await evaluate("window.__xp.experienceManager._fullPaintManager.show(3)");
  await sleep(1600);
  const fullPaintState = await evaluate(`(()=>{const manager=window.__xp.experienceManager._fullPaintManager;const uniforms=manager._material.uniforms;return {visible:manager.isVisible,rendering:manager.isRendering,alpha:uniforms.uAlpha.value,scale:uniforms.uScale.value,progress:uniforms.uVisibleProgress.value};})()`);
  const fullPaintRuntimeState = await evaluate(`(()=>{const state=window.__xp.experienceManager.runtimeState;return {phase:state.phase,landscapeScene:state.landscapeScene,activeScene:state.activeScene};})()`);
  const fullPaintVisible = fullPaintState.visible;
  await screenshot(resolve(caseDir, "60-full-paint.png"));
  await evaluate("window.__xp.experienceManager._fullPaintManager.hide()");
  await sleep(800);

  await evaluate("window.__xp.experienceManager.showFullscreenPoem()");
  await sleep(900);
  const poemOpening = await evaluate(`(()=>{const manager=window.__xp.experienceManager;const poem=manager._poemView;const background=poem?._backgroundMaterial;const text=poem?._textMaterial;const canvas=manager._textCanvas;return {visible:!!poem?.isVisible,phase:document.documentElement.dataset.experiencePhase,backVisible:document.getElementById('poem-back')?.classList.contains('is-visible')??false,backgroundSimulation:background?.uniforms.uSimulation.value===manager._simulation.texture,backgroundAlpha:background?.uniforms.uSimulationAlpha.value??0,backgroundShader:background?.fragmentShader?.includes('uSimulationAlpha')&&background?.fragmentShader?.includes('uPaperTexture'),textCanvas:text?.uniforms.map.value===canvas.poemTexture,textSourceData:canvas.poemCanvasPixelHeight===2304&&canvas.poemUvBoxes.length===4&&canvas.poemPixelBoxes[0].max.x-canvas.poemPixelBoxes[0].min.x===400,textSourceScrollHeight:canvas.poemCanvasPixelHeight===canvas.poemPixelBoxes[0].max.y,textUvBoxes:text?.uniforms.uSharpUvs.value?.z>0&&text?.uniforms.uLowBlurUvs.value?.z>text?.uniforms.uSharpUvs.value?.z,textShader:text?.fragmentShader?.includes('uTileRatio')&&text?.fragmentShader?.includes('uSharpUvs')&&text?.fragmentShader?.includes('remapRawLocal')};})()`);
  await screenshot(resolve(caseDir, "62-poem-opening.png"));
  const poemHiding = await evaluate(`(async()=>{const manager=window.__xp.experienceManager;const poem=manager._poemView;const before=poem?._backgroundMaterial?.uniforms.uSimulationAlpha.value??0;manager.hideFullscreenPoem();await new Promise(r=>setTimeout(r,150));const after=poem?._backgroundMaterial?.uniforms.uSimulationAlpha.value??0;return {visible:!!poem?.isVisible,before,backgroundAlpha:after,decreased:after<before};})()`);
  await screenshot(resolve(caseDir, "63-poem-hiding.png"));
  await sleep(3800);
  const poemClosed = await evaluate(`(()=>{const manager=window.__xp.experienceManager;const poem=manager._poemView;return {visible:!!poem?.isVisible,phase:document.documentElement.dataset.experiencePhase,backVisible:document.getElementById('poem-back')?.classList.contains('is-visible')??false,backgroundAlpha:poem?._backgroundMaterial?.uniforms.uSimulationAlpha.value??1,uiVisible:!!manager._uiView?.isVisible};})()`);

  await evaluate("window.__xp.experienceManager._fullPaintManager.show(3)");
  await sleep(120);
  const fullPaintSoftFailure = await evaluate(`(async()=>{const manager=window.__xp.experienceManager;const fullPaint=manager._fullPaintManager;const video=fullPaint._videoCache.get('over/3');if(!video)return {available:false};video.dispatchEvent(new Event('error'));await new Promise(requestAnimationFrame);return {available:true,visible:fullPaint.isVisible,rendering:fullPaint.isRendering,sceneIndex:fullPaint.sceneIndex,baseTexture:!!fullPaint._material.uniforms.uPaintTexture.value,overTexture:!!fullPaint._material.uniforms.uPaintTexture2.value,fallback:fullPaint.videoFallback};})()`);
  await evaluate("window.__xp.experienceManager._fullPaintManager.hide()");
  await sleep(800);
  await evaluate("window.__xp.experienceManager._fullPaintManager.show(3)");
  await sleep(120);
  const fullPaintFailure = await evaluate(`(async()=>{const manager=window.__xp.experienceManager;const fullPaint=manager._fullPaintManager;const video=fullPaint._videoCache.get('base/3');if(!video)return {available:false};video.dispatchEvent(new Event('error'));await new Promise(requestAnimationFrame);const notice=document.getElementById('experience-notice');return {available:true,visible:fullPaint.isVisible,rendering:fullPaint.isRendering,phase:document.documentElement.dataset.experiencePhase,noticeVisible:!!notice&&!notice.hidden,noticeText:(notice?.textContent??'').trim(),failure:fullPaint.videoFailure};})()`);
  await screenshot(resolve(caseDir, "61-full-paint-resource-failure.png"));

  await evaluate("window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})");
  await sleep(1300);
  const finalSlot = await evaluate(`(()=>{const section=document.getElementById('advantages');const slot=section?.querySelector('.experience-content-slot');const restart=document.getElementById('restart-btn');return {exists:!!slot,height:slot?.getBoundingClientRect().height??0,text:(restart?.innerText??'').trim(),restartVisible:!!restart,faqCount:section?.querySelectorAll('.faq .question').length??0};})()`);
  await screenshot(resolve(caseDir, "70-content-and-faq.png"));
  await evaluate("document.getElementById('restart-btn')?.click()")
  await sleep(1900);
  const restartY = await evaluate("window.scrollY");
  await screenshot(resolve(caseDir, "80-restart.png"));

  cases.push({ ...viewport, runtimeState, definitionContent, paperLayerState, layerState, cursorState, cameraState, leavesState, leavesLifecycle, fullPaintLifecycle, uvMapping, layerDurations, groundLifecycle, cutoutLifecycle, renderResolution, sourceMaterialState, backgroundCompositeState, globalGroundState, fluidPassState, fluidStencilState, fluidActivityState, idleHoverState, scrollStep, scrollResponse, rippleScene, smallBrushSample, largeBrushSample, brushSample, brushSlowMotion, brushMotion, grassLifecycle, slowMotion, timings, titleClick, fullPaintVisible, fullPaintState, fullPaintRuntimeState, poemOpening, poemHiding, poemClosed, fullPaintSoftFailure, fullPaintFailure, finalSlot, restartY });
}

// The shipped route keeps the accepted delivery timing. Run one browser pass
// through the explicit source profile as well, so source/pixel-diff work has a
// tested 7 / 10 / 15 second track instead of an unverified query switch.
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await send("Page.navigate", { url: `${baseUrl}?seed=47&freeze=6&reveal=source#autostart` });
await waitForExperience();
await sleep(900);
const sourceRevealProfile = await evaluate(`(()=>{const view=window.__xp.experienceManager._watercolorView;const paper=view.papers.find(entry=>entry.config.revealType==='default');if(!paper)return null;view._reveal(paper);const tweens=paper.tween.getChildren(true,true,false);const timing=view.getRevealTiming?.();const result={timing,completeLayerBaseline:view._paperMaterial?.uniforms.uCompleteLayerBaseline?.value??null,rise:tweens.find(tween=>tween.vars.rotationZ===0)?.duration()??null,curve:tweens.find(tween=>tween.vars.curve===1)?.duration()??null,reveal:tweens.find(tween=>tween.vars.reveal===15)?.duration()??null};paper.tween.kill();view.hideAll();return result;})()`);

// Keep a fixed source mid-state beside the structural timing assertion. This
// is intentionally captured at timeline time 1.5 s (uRevealProgress = 1.5),
// so paper texture, ink front and transparent layer behavior remain visually
// inspectable after later shader changes.
const sourceRevealVisual = await evaluate(`(()=>{const view=window.__xp.experienceManager._watercolorView;const paper=view.papers.find(entry=>entry.config.revealType==='default');if(!paper)return null;view.hideAll();view._reveal(paper);paper.tween.timeScale(.1).pause().seek(1.5);return {timelineSeconds:1.5,revealProgress:paper.state.reveal,rotationZ:paper.state.rotationZ,alpha:paper.state.alpha,curve:paper.state.curve,completeLayerBaseline:view._paperMaterial?.uniforms.uCompleteLayerBaseline?.value??null};})()`);
await screenshot(resolve(outputRoot, "source-profile-1440x900-mid.png"));

const sourceRevealProfilePassed = sourceRevealProfile?.timing?.profile === "source"
  && sourceRevealProfile?.timing?.riseSeconds === 7
  && sourceRevealProfile?.timing?.curveSeconds === 10
  && sourceRevealProfile?.timing?.revealSeconds === 15
  && sourceRevealProfile?.timing?.revealProgressMax === 15
  && sourceRevealProfile?.completeLayerBaseline === 0
  && Math.abs(sourceRevealProfile?.rise - 7) <= 0.1
  && Math.abs(sourceRevealProfile?.curve - 10) <= 0.1
  && Math.abs(sourceRevealProfile?.reveal - 15) <= 0.1;

// Audio requires a trusted click instead of the #autostart QA shortcut.
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await send("Page.navigate", { url: `${baseUrl}?seed=47&freeze=6` });
for (let index = 0; index < 80; index++) {
  if (await evaluate("document.querySelector('#loader .middle-w')?.classList.contains('loaded')")) break;
  await sleep(250);
}
const enterPoint = await evaluate(`(()=>{const rect=document.querySelector('#loader .middle-w').getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};})()`);
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: enterPoint.x, y: enterPoint.y, button: "left", clickCount: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: enterPoint.x, y: enterPoint.y, button: "left", clickCount: 1 });
await waitForExperience();
await sleep(2300);
const audioStarted = await evaluate(`(()=>{const audio=document.querySelector('.loop-main');return {state:window.__xp.audioManager.getDebugState(),volume:audio.volume,toggleHidden:document.getElementById('sound-toggle').classList.contains('hidden')};})()`);
const soundPoint = await evaluate(`(()=>{const rect=document.getElementById('sound-toggle').getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};})()`);
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: soundPoint.x, y: soundPoint.y, button: "left", clickCount: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: soundPoint.x, y: soundPoint.y, button: "left", clickCount: 1 });
await sleep(900);
const audioMuted = await evaluate("window.__xp.audioManager.getDebugState()");
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: soundPoint.x, y: soundPoint.y, button: "left", clickCount: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: soundPoint.x, y: soundPoint.y, button: "left", clickCount: 1 });
await sleep(1100);
const audioResumed = await evaluate("window.__xp.audioManager.getDebugState()");
await evaluate("window.__xp.audioManager.switchThemeTo('loop-poem')");
await sleep(1100);
const audioPoem = await evaluate("window.__xp.audioManager.getDebugState()");
const audio = { started: audioStarted, muted: audioMuted, resumed: audioResumed, poem: audioPoem };
const contextLossFallback = await evaluate(`(()=>{const canvas=document.getElementById('xp-canvas');const manager=window.__xp.experienceManager;const lost=new Event('webglcontextlost',{cancelable:true});const dispatchResult=canvas?.dispatchEvent(lost);const afterLost={defaultPrevented:lost.defaultPrevented,dispatchCancelled:dispatchResult===false,fallback:document.documentElement.classList.contains('is-fallback'),phase:document.documentElement.dataset.experiencePhase,runtimeDetached:manager?._webglApp===null,audioMuted:window.__xp.audioManager.getDebugState().muted};const restored=new Event('webglcontextrestored');canvas?.dispatchEvent(restored);return {...afterLost,restoredFallback:document.documentElement.classList.contains('is-fallback')&&document.documentElement.dataset.experiencePhase==='fallback'};})()`);

const report = {
  checkedAt: new Date().toISOString(),
  cases,
  sourceRevealProfile,
  sourceRevealVisual,
  sourceRevealProfilePassed,
  audio,
  contextLossFallback,
  reducedFallback,
  consoleErrors,
  remoteResources: [...remoteResources],
  passed: reducedFallback.isFallback
    && reducedFallback.faqVisible
    && reducedFallback.restartResets
    && consoleErrors.length === 0
    && remoteResources.size === 0
    && audio.started.state.unlocked
    && !audio.started.state.muted
    && !audio.started.state.paused
    && audio.started.state.currentTime > 0.5
    && audio.started.volume === 1
    && !audio.started.toggleHidden
    && audio.muted.muted
    && audio.muted.paused
    && !audio.resumed.muted
    && !audio.resumed.paused
    && audio.resumed.currentTime > audio.started.state.currentTime
    && audio.poem.theme === "loop-poem"
    && !audio.poem.paused
    && contextLossFallback.defaultPrevented
    && contextLossFallback.dispatchCancelled
    && contextLossFallback.fallback
    && contextLossFallback.phase === "fallback"
    && contextLossFallback.runtimeDetached
    && contextLossFallback.audioMuted
    && contextLossFallback.restoredFallback
    && cases.every((testCase) => testCase.restartY === 0
      && testCase.runtimeState?.phase === "exploring"
      && testCase.runtimeState?.assetProgress === 100
      && testCase.runtimeState?.assetsReady
      && testCase.runtimeState?.activeScene === 1
      && testCase.runtimeState?.activePoem === 0
      && testCase.runtimeState?.error === null
      && testCase.fullPaintVisible
      && testCase.fullPaintState.rendering
      && testCase.fullPaintRuntimeState?.phase === "landscape"
      && testCase.fullPaintRuntimeState?.landscapeScene === 3
      && testCase.fullPaintState.alpha === 1
      && testCase.fullPaintState.scale >= 0.99
      && testCase.fullPaintState.scale <= 1.4
      && testCase.fullPaintState.progress > 0
      && testCase.poemOpening?.visible
      && testCase.poemOpening.phase === "poem"
      && testCase.poemOpening.backVisible
      && testCase.poemOpening.backgroundSimulation
      && testCase.poemOpening.backgroundAlpha > 0
      && testCase.poemOpening.backgroundShader
      && testCase.poemOpening.textCanvas
      && testCase.poemOpening.textSourceData
      && testCase.poemOpening.textSourceScrollHeight
      && testCase.poemOpening.textUvBoxes
      && testCase.poemOpening.textShader
      && testCase.poemHiding.visible
      && testCase.poemHiding.decreased
      && !testCase.poemClosed.visible
      && testCase.poemClosed.phase === "scroll"
      && !testCase.poemClosed.backVisible
      && testCase.poemClosed.backgroundAlpha < 0.01
      && testCase.poemClosed.uiVisible
      && testCase.fullPaintFailure?.available
      && !testCase.fullPaintFailure.visible
      && !testCase.fullPaintFailure.rendering
      && testCase.fullPaintFailure.phase === "scroll"
      && testCase.fullPaintFailure.noticeVisible
      && testCase.fullPaintFailure.noticeText.length > 0
      && testCase.fullPaintSoftFailure?.available
      && testCase.fullPaintSoftFailure.rendering
      && testCase.fullPaintSoftFailure.sceneIndex === 3
      && testCase.fullPaintSoftFailure.baseTexture
      && testCase.fullPaintSoftFailure.overTexture
      && testCase.fullPaintSoftFailure.fallback?.from === "over"
      && testCase.fullPaintSoftFailure.fallback?.to === "base"
      && testCase.layerState.paperCount === 26
      && testCase.layerState.premature === 0
      && testCase.layerState.completeLayerBaseline === 1
      && testCase.layerState.revealTiming?.profile === "delivery"
      && testCase.layerState.revealTiming?.riseSeconds === 3
      && testCase.layerState.revealTiming?.curveSeconds === 5
      && testCase.layerState.revealTiming?.revealSeconds === 7
      && testCase.layerState.titleCount === 6
      && testCase.layerState.simulationRegions === 27
      && testCase.fullPaintLifecycle.paperIndex === 26
      && testCase.fullPaintLifecycle.painted.pigment > 0.01
      && testCase.fullPaintLifecycle.cleared.pigment < 0.001
      && testCase.fullPaintLifecycle.visibleThreshold
      && testCase.layerState.simulationUniqueSizes >= 4
      && testCase.layerState.simulationOverlaps === 0
      && Math.abs(testCase.layerState.fullPaintRegion?.ratio - 1.6) < 0.01
      && Math.abs(testCase.uvMapping.paperNormalizedX - 0.8) < 0.001
      && Math.abs(testCase.uvMapping.groundNormalizedX - 0.2) < 0.001
      && (testCase.mobile || testCase.layerState.grassPatches >= 20)
      && (testCase.mobile || testCase.layerState.grassBounds > 2.5)
      && testCase.layerState.paperYawAlignment < 0.0001
      && testCase.layerState.shadowSources === 24
      && testCase.layerState.shadowTexture === "source-shadow-projection"
      && testCase.layerState.groundBatch
      && testCase.layerState.groundBatchAttributes
      && testCase.layerState.groundBatchUniforms
      && (testCase.mobile
        ? !testCase.cursorState.enabled
        : testCase.cursorState.enabled
          && testCase.cursorState.active
          && testCase.cursorState.circleSize > 40
          && testCase.cursorState.fullRing
          && testCase.cursorState.overflow === "visible"
          && testCase.cursorState.innerDot)
      && testCase.layerState.cutoutShadowSources === 24
      && testCase.layerState.cutoutShadowMesh
      && testCase.layerState.cutoutShadowAttributes
      && testCase.layerState.cutoutShadowShader
      && testCase.layerState.cutoutShadowUniforms
      && Math.abs(testCase.cameraState?.duration - 59.766666666666666) < 0.01
      && testCase.cameraState?.entryDuration === 5
      && testCase.cameraState?.pointerForceX === 2.55
      && testCase.cameraState?.pointerForceY === 9.2
      && testCase.cameraState?.pointerDamping === 0.3
      && testCase.cameraState?.touchParallaxDisabled === testCase.mobile
      && (testCase.mobile || (testCase.leavesState?.enabled
        && testCase.leavesState.count === 1024
        && testCase.leavesState.passSize === 32
        && testCase.leavesState.hasPositionPass
        && testCase.leavesLifecycle?.lastIndex >= 0))
      && Math.abs(testCase.layerDurations.rise - 3) <= 0.1
      && Math.abs(testCase.layerDurations.curve - 5) <= 0.1
      && Math.abs(testCase.layerDurations.reveal - 7) <= 0.1
      && Math.abs(testCase.layerDurations.fade.rotationZ) < 0.0001
      && Math.abs(testCase.layerDurations.fade.curve - 1) < 0.0001
      && Math.abs(testCase.layerDurations.fade.alphaDuration - 3) <= 0.1
      && !testCase.layerDurations.fade.hasRise
      && testCase.groundLifecycle?.initial === 0
      && testCase.groundLifecycle?.batchCount === 26
      && testCase.groundLifecycle?.visible
      && Math.abs(testCase.groundLifecycle?.alphaDuration - 0.4) <= 0.1
      && testCase.cutoutLifecycle?.initial === 0
      && testCase.cutoutLifecycle?.mid > 0.1
      && testCase.cutoutLifecycle?.done > 0.99
      && testCase.renderResolution?.canvas?.[0] === testCase.renderResolution?.paper?.[0]
      && testCase.renderResolution?.canvas?.[1] === testCase.renderResolution?.paper?.[1]
      && testCase.renderResolution?.canvas?.[0] === testCase.renderResolution?.ground?.[0]
      && testCase.renderResolution?.canvas?.[1] === testCase.renderResolution?.ground?.[1]
      && Math.abs(testCase.sourceMaterialState?.lighting?.groundScale?.[0] - 27.5) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.groundScale?.[1] - 10.7) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.groundOffset?.[0] - 8.12) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.groundOffset?.[1] - 0.38) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.groundStrength - 0.47) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.specularCenter?.[0] - 1.2) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.specularCenter?.[1] - 0.7) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.specularScale?.[0] - 0.82) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.specularScale?.[1] - 0.67) < 0.001
      && Math.abs(testCase.sourceMaterialState?.lighting?.specularStrength - 0.18) < 0.001
      && testCase.sourceMaterialState?.background?.ground === "b4b4b4"
      && testCase.sourceMaterialState?.background?.sky === "e4e4e4"
      && Math.abs(testCase.sourceMaterialState?.background?.progress?.[0] - 0.5) < 0.001
      && Math.abs(testCase.sourceMaterialState?.background?.progress?.[1] - 1) < 0.001
      && testCase.backgroundCompositeState?.noise
      && testCase.backgroundCompositeState?.projectionInverse === 16
      && testCase.backgroundCompositeState?.viewInverse === 16
      && testCase.backgroundCompositeState?.view === 16
      && !testCase.backgroundCompositeState?.shadowUniform
      && testCase.backgroundCompositeState?.resolution?.[0] === testCase.renderResolution?.canvas?.[0]
      && testCase.backgroundCompositeState?.resolution?.[1] === testCase.renderResolution?.canvas?.[1]
      && testCase.globalGroundState?.mesh
      && testCase.globalGroundState?.renderOrder === -3
      && testCase.globalGroundState?.receiveShadow
      && testCase.globalGroundState?.plane?.[0] === 2000
      && testCase.globalGroundState?.plane?.[1] === 2000
      && testCase.globalGroundState?.shader
      && testCase.globalGroundState?.shadowUniform
      && Math.abs(testCase.globalGroundState?.shadowStrength - 0.9) < 0.001
      && testCase.globalGroundState?.lightingUniform
      && testCase.globalGroundState?.backgroundUniform
      && testCase.globalGroundState?.noise
      && testCase.globalGroundState?.resolution?.[0] === testCase.renderResolution?.canvas?.[0]
      && testCase.globalGroundState?.resolution?.[1] === testCase.renderResolution?.canvas?.[1]
      && testCase.fluidPassState?.divergenceUsesDt
      && testCase.fluidPassState?.divergenceUsesSingleCell
      && testCase.fluidPassState?.advectionUsesV2
      && testCase.fluidPassState?.splatUsesSourceEllipse
      && testCase.fluidPassState?.dtScaling
      && testCase.fluidPassState?.fullPaintSourceAlpha
      && testCase.fluidStencilState?.stencilTargets
      && testCase.fluidStencilState?.stencilMesh
      && testCase.fluidStencilState?.stencilActiveAttribute
      && testCase.fluidStencilState?.fourFrameHistory
      && testCase.fluidActivityState?.marked
      && testCase.fluidActivityState?.expired
      && testCase.fluidActivityState?.fullActive
      && testCase.fluidActivityState?.ordinarySuppressed
      && testCase.idleHoverState?.movementCalls > 0
      && testCase.idleHoverState?.brushSample
      && testCase.idleHoverState?.idleDoesNotRefresh
      && testCase.timings.every(entry => entry.sample.travelMultiplier === 7.5)
      // Derive the 100px camera advance from the same content-height,
      // travel-multiplier and camera-tail contract used by ScrollController;
      // allow browser scroll settling a bounded 15% around that value.
      && testCase.scrollStep.advance >= testCase.scrollStep.expectedAdvance * 0.85
      && testCase.scrollStep.advance <= testCase.scrollStep.expectedAdvance * 1.15
      && testCase.scrollResponse.maxLag <= 0.0151
      && testCase.scrollResponse.firstFrameMoved <= 1
      && testCase.scrollResponse.runtimeAt24?.activeScene === 4
      && testCase.scrollResponse.runtimeAt24?.activePoem === 1
      && testCase.scrollResponse.runtimeAt24?.scrollProgress > 0.3
      && testCase.timings.some((entry) => entry.visibleTitles > 0)
      && testCase.titleClick.available
      && testCase.titleClick.visible
      && testCase.titleClick.sceneIndex === testCase.titleClick.expected
      && testCase.finalSlot.exists
      && testCase.finalSlot.height >= testCase.height * 2.35
      && testCase.finalSlot.text === "Restart the experience"
      && testCase.finalSlot.restartVisible
      && testCase.finalSlot.faqCount === 5
      && testCase.definitionContent?.loaderIntro === testCase.definitionContent?.expectedIntro
      && testCase.definitionContent?.poemCount === 3
      && testCase.definitionContent?.firstPoemHasSource
      && testCase.definitionContent?.tailHeading === testCase.definitionContent?.expectedTailHeading
      && testCase.definitionContent?.faqCount === 5
      && testCase.definitionContent?.substackParagraphs === 4
      && testCase.definitionContent?.awards
      && testCase.definitionContent?.fontFamily === "Canela Text"
      && testCase.definitionContent?.worldModel === "/xp/models/scene.glb"
      && testCase.definitionContent?.worldGroundAtlas === "/xp/textures/grounds/atlas.ktx2"
      && testCase.definitionContent?.modelResourceBound
      && testCase.definitionContent?.groundResourceBound
      && testCase.definitionContent?.rgbaNoiseResourceBound
      && testCase.definitionContent?.basisPath === "/xp/libs/basis/"
      && testCase.definitionContent?.atlasSdfCount === 26
      && testCase.definitionContent?.atlasTextureCount === 26
      && testCase.definitionContent?.atlasScheduleCount === 26
      && testCase.definitionContent?.atlasPaperNamesMatch
      && testCase.definitionContent?.atlasScheduleMatches
      && Math.abs(testCase.definitionContent?.atlasSdfTreeRemap?.x - 0.10248046875) < 0.000000001
      && Math.abs(testCase.definitionContent?.atlasTextureTreeRemap?.x - 0.0048828125) < 0.000000001
      && testCase.definitionContent?.paperManifestCount === 26
      && testCase.definitionContent?.paperGroundCount === 23
      && testCase.definitionContent?.paperLeavesCount === 10
      && testCase.definitionContent?.paperShadowCount === 24
      && testCase.definitionContent?.paperHoleCount === 24
      && testCase.definitionContent?.paperFadeCount === 1
      && testCase.definitionContent?.paperTitleCount === 6
      && testCase.definitionContent?.paperManifestContract
      && testCase.definitionContent?.sceneLabels?.join("|") === "场景 1|场景 2|场景 3|场景 4|场景 5|场景 6"
      && testCase.definitionContent?.sceneTitles?.join("|") === "Dales with Cows|Nidderdale Farm|North York Moors|Dales near Aysgarth|Dales with Sheep|Ribblehead Viaduct"
      && testCase.definitionContent?.sceneFocusProgress?.length === 6
      && testCase.definitionContent.sceneFocusProgress.every((value, index) => Math.abs(value - [0.02, 0.14, 0.26, 0.34, 0.55, 0.66][index]) < 0.000001)
      && testCase.definitionContent?.runtimeSceneStarts?.length === 6
      && testCase.definitionContent.runtimeSceneStarts.every((value, index) => Math.abs(value - [0.02, 0.14, 0.26, 0.34, 0.55, 0.66][index]) < 0.000001)
      && testCase.definitionContent?.runtimePoemBreakpoints?.join("|") === "0.32|0.62"
      && Math.abs(testCase.definitionContent?.runtimeCameraTailSeconds - (59.7667 - 55)) < 0.000001
      && testCase.definitionContent?.runtimeTravelMultiplier === 7.5
      && testCase.paperLayerState?.groundCount === 26
      && testCase.paperLayerState?.groundEnabledCount === 23
      && testCase.paperLayerState?.sdfCount === 26
      && testCase.paperLayerState?.sdfFadeCount === 1
      && testCase.paperLayerState?.sdfTransparentCount === 1
      && testCase.paperLayerState?.vegetationCount === 26
      && testCase.paperLayerState?.vegetationLeavesCount === 10
      && testCase.paperLayerState?.shadowCount === 26
      && testCase.paperLayerState?.shadowCastCount === 24
      && testCase.paperLayerState?.shadowHoleCount === 24
      && testCase.paperLayerState?.aligned
      && testCase.paperLayerState?.groundContract
      && testCase.paperLayerState?.sdfContract
      && testCase.paperLayerState?.vegetationContract
      && testCase.paperLayerState?.shadowContract
      && (testCase.mobile || (testCase.grassLifecycle?.risen >= 0.95
        && testCase.grassLifecycle?.fallen <= 0.05))
      && (testCase.mobile || testCase.width !== 1440 || (testCase.slowMotion?.timeScale === 0.1
        && !testCase.slowMotion?.complete
        && Math.abs(testCase.slowMotion?.rotationZ + Math.PI / 2) > 0.05
        && Math.abs(testCase.slowMotion?.rotationZ) < 0.5
        && testCase.slowMotion?.revealProgress > 0
        && testCase.slowMotion?.revealProgress < 15
        && testCase.slowMotion?.revealCompletion > 0
        && testCase.slowMotion?.revealCompletion < 1
        && Math.abs(testCase.slowMotion?.edgeCatchup.endTime - 6.5) < 0.001
        && testCase.slowMotion?.edgeCatchup.before < 1
        && testCase.slowMotion?.edgeCatchup.at === 1
        && testCase.slowMotion?.edgeCatchup.after === 1))
      && (testCase.mobile || (testCase.largeBrushSample?.paperIndex === 0
        && testCase.smallBrushSample?.sourceScale >= 0.2
        && testCase.smallBrushSample?.sourceScale <= 0.5
        && testCase.smallBrushSample?.visibleDiameter <= 47.5
        && testCase.largeBrushSample?.sourceScale >= 1.6
        && testCase.largeBrushSample?.sourceScale <= 1.8001
        && testCase.largeBrushSample?.visibleDiameter >= 152
        && testCase.largeBrushSample?.visibleDiameter <= 171.01
        && testCase.brushSample?.aspectRatio <= 1.15
        && testCase.brushSample?.accumulation?.pigment > 0.05
        && (testCase.width !== 1440 || (testCase.brushSlowMotion?.timeScale === 0.1
          && testCase.brushSlowMotion?.steps === 11
          && testCase.brushSlowMotion?.first.sourceScale === 0.2
          && Math.abs(testCase.brushSlowMotion?.last.sourceScale - 1.8) < 0.0001
          && testCase.brushSlowMotion?.continuity.every(value => value > 0.05)
          && testCase.brushMotion?.small.diameter < testCase.brushMotion?.small.ringDiameter
          && testCase.brushMotion?.small.center.pigment > testCase.brushMotion?.small.outside.pigment
          && testCase.brushMotion?.large.rangeRatio >= 1.6
          && testCase.brushMotion?.large.rangeRatio <= 2
          && testCase.brushMotion?.large.immediate.current.pigment > 0.05
          && testCase.brushMotion?.large.immediate.previous.pigment < testCase.brushMotion?.large.immediate.current.pigment
          && testCase.brushMotion?.large.immediate.midpoint.pigment < testCase.brushMotion?.large.immediate.current.pigment
          // Half-float/noise can move an intermediate sample by a few
          // thousandths; keep the decay envelope strict while allowing that
          // GPU quantization jitter.
          && testCase.brushMotion?.decay[1].value <= testCase.brushMotion?.decay[0].value + 0.02
          && testCase.brushMotion?.decay[2].value <= testCase.brushMotion?.decay[1].value + 0.02
          && testCase.brushMotion?.decay[2].value > testCase.brushMotion?.decay[3].value
          && testCase.brushMotion?.decay[2].value > testCase.brushMotion?.decay[3].value
          && testCase.brushMotion?.decay[1].value > 0.03
          // The focused probe advances exactly 180 simulation frames. Keep a
          // deterministic regression bound here; the separate real-time brush
          // capture remains the perceptual ~3 s acceptance evidence.
      && testCase.brushMotion?.decay[3].value < 0.35))))),
};
writeFileSync(resolve(outputRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
ws.close();
if (!report.passed || !report.sourceRevealProfilePassed) process.exitCode = 1;
