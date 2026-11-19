import { useEffect, useMemo, useState } from 'react'
import { Activity, Calculator, ChartNoAxesCombined, Dices, Play, RotateCcw, Table2 } from 'lucide-react'

type LabTab = 'vectors' | 'probability' | 'gradient' | 'optimizers' | 'python'
const clamp = (n:number,min:number,max:number) => Math.min(max,Math.max(min,n))

export default function MathLabs() {
  const [tab,setTab] = useState<LabTab>('vectors')
  const [ax,setAx] = useState(2); const [ay,setAy] = useState(3)
  const [bx,setBx] = useState(4); const [by,setBy] = useState(1)
  const [lr,setLr] = useState(.1); const [w,setW] = useState(0); const [steps,setSteps] = useState(0); const [isPlaying,setIsPlaying] = useState(false)
  const [samples,setSamples] = useState(500); const [seed,setSeed] = useState(7)
  const [dataset,setDataset] = useState('sales')
  const dot=ax*bx+ay*by
  const normA=Math.hypot(ax,ay), normB=Math.hypot(bx,by)
  const cosine=normA*normB===0?0:dot/(normA*normB)
  const gradientPath=useMemo(()=>{let x=0;const pts=[x];for(let i=0;i<45;i++){x=x-lr*2*(x-3);pts.push(x)}return pts},[lr])
  const monte=useMemo(()=>{
    let state=seed>>>0; const rand=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296}
    let inside=0;const points:{x:number;y:number;inside:boolean}[]=[]
    for(let i=0;i<samples;i++){const x=rand(),y=rand(),hit=x*x+y*y<=1;if(hit)inside++;if(i<650)points.push({x,y,inside:hit})}
    return {inside,points,estimate:4*inside/samples}
  },[samples,seed])
  const optimizer=useMemo(()=>{
    const rows:{i:number;sgd:number;momentum:number;adam:number}[]=[]
    let a=-4,b=-4,c=-4,momentumM=0,adamM=0,v=0
    for(let i=1;i<=40;i++){
      const ga=2*(a-2),gb=2*(b-2),gc=2*(c-2)
      a-=.08*ga
      momentumM=.8*momentumM+.2*gb;b-=.08*momentumM
      adamM=.9*adamM+.1*gc;v=.999*v+.001*gc*gc
      const mh=adamM/(1-Math.pow(.9,i)),vh=v/(1-Math.pow(.999,i))
      c-=.15*mh/(Math.sqrt(vh)+1e-8)
      rows.push({i,sgd:(a-2)**2,momentum:(b-2)**2,adam:(c-2)**2})
    }
    return rows
  },[])
  useEffect(()=>{
    if(!isPlaying)return
    if(steps>=45){setIsPlaying(false);return}
    const timer=window.setTimeout(()=>{setW(x=>x-lr*2*(x-3));setSteps(steps+1)},350)
    return ()=>window.clearTimeout(timer)
  },[isPlaying,steps,lr])
  const resetGradient=()=>{setIsPlaying(false);setW(0);setSteps(0)}
  const stepGradient=()=>{setIsPlaying(false);setW(x=>x-lr*2*(x-3));setSteps(x=>x+1)}
  const tabs:[LabTab,string][]=[['vectors','Vectors & matrices'],['probability','Monte Carlo'],['gradient','Gradient descent'],['optimizers','Optimizers'],['python','Python data lab']]
  return <section className="labs-shell">
    <div className="labs-intro"><div className="eyebrow"><Activity size={14}/> PHASE 3 · INTERACTIVE FOUNDATIONS</div><h2>Mathematics & Python Labs</h2><p>Change real inputs, inspect intermediate calculations and build intuition before moving to libraries or large datasets.</p></div>
    <div className="lab-tabs" role="tablist" aria-label="Interactive foundations labs">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div>
    {tab==='vectors'&&<div className="lab-card"><div className="lab-card-heading"><Calculator/><div><h3>Vector & matrix calculator</h3><p>Explore dot products, vector lengths, cosine similarity and a matrix-vector product.</p></div></div>
      <div className="vector-grid"><div className="control-stack"><h4>Vector A</h4><Slider label="Aₓ" value={ax} min={-5} max={5} onChange={setAx}/><Slider label="Aᵧ" value={ay} min={-5} max={5} onChange={setAy}/><h4>Vector B</h4><Slider label="Bₓ" value={bx} min={-5} max={5} onChange={setBx}/><Slider label="Bᵧ" value={by} min={-5} max={5} onChange={setBy}/></div>
      <div className="vector-plot"><svg viewBox="0 0 320 240" role="img" aria-label="Vector A and B plotted from the origin"><defs><marker id="arrow-a" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#8da0ff"/></marker><marker id="arrow-b" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#50d6ae"/></marker></defs>{Array.from({length:11},(_,i)=><g key={i}><line x1={25+i*27} y1="12" x2={25+i*27} y2="228" stroke="#26334a"/><line x1="25" y1={12+i*21.6} x2="295" y2={12+i*21.6} stroke="#26334a"/></g>)}<line x1="160" y1="12" x2="160" y2="228" stroke="#70809d"/><line x1="25" y1="120" x2="295" y2="120" stroke="#70809d"/><line x1="160" y1="120" x2={160+ax*22} y2={120-ay*18} stroke="#8da0ff" strokeWidth="3" markerEnd="url(#arrow-a)"/><line x1="160" y1="120" x2={160+bx*22} y2={120-by*18} stroke="#50d6ae" strokeWidth="3" markerEnd="url(#arrow-b)"/><text x={160+ax*22+5} y={120-ay*18-7} fill="#aebaff" fontSize="11">A</text><text x={160+bx*22+5} y={120-by*18-7} fill="#65e2bd" fontSize="11">B</text></svg><div className="plot-legend"><span><i className="legend-a"/>Vector A</span><span><i className="legend-b"/>Vector B</span></div></div></div>
      <div className="metric-grid"><Metric label="Dot product" value={dot.toFixed(2)} detail={`${ax}×${bx} + ${ay}×${by}`}/><Metric label="‖A‖ length" value={normA.toFixed(3)}/><Metric label="‖B‖ length" value={normB.toFixed(3)}/><Metric label="Cosine similarity" value={cosine.toFixed(3)} detail="Alignment from −1 to +1"/></div>
      <div className="worked-callout"><strong>Matrix × vector example</strong><p>For M = [[1, 2], [3, 4]] and x = [{ax}, {ay}], Mx = [{ax+2*ay}, {3*ax+4*ay}]. The output has two values because the matrix has two rows.</p></div>
    </div>}
    {tab==='probability'&&<div className="lab-card"><div className="lab-card-heading"><Dices/><div><h3>Monte Carlo: estimate π</h3><p>Sample random points inside a unit square. The fraction inside the quarter-circle estimates π / 4.</p></div></div><div className="lab-controls"><Slider label="Samples" value={samples} min={100} max={5000} step={100} onChange={setSamples}/><Slider label="Random seed" value={seed} min={1} max={99} onChange={setSeed}/><button className="lab-secondary" onClick={()=>setSeed(s=>s>=99?1:s+1)}><RotateCcw size={14}/> New sample</button></div><div className="monte-layout"><svg viewBox="0 0 240 240" role="img" aria-label={`${samples} random samples, ${monte.inside} inside the quarter circle`}><rect x="10" y="10" width="220" height="220" fill="#111c30" stroke="#657492"/><path d="M10 10 A220 220 0 0 1 230 230 L10 230 Z" fill="#263a57" opacity=".65"/>{monte.points.map((p,i)=><circle key={i} cx={10+p.x*220} cy={230-p.y*220} r="1.7" fill={p.inside?'#61d8b3':'#f2a46c'} opacity=".8"/>)}</svg><div className="monte-stats"><Metric label="Estimated π" value={monte.estimate.toFixed(5)}/><Metric label="Actual π" value={Math.PI.toFixed(5)}/><Metric label="Absolute error" value={Math.abs(monte.estimate-Math.PI).toFixed(5)}/><Metric label="Inside / total" value={`${monte.inside} / ${samples}`}/></div></div><div className="worked-callout"><strong>Why does this work?</strong><p>Quarter-circle area is πr²/4. The square area is r². Their ratio is π/4, so π ≈ 4 × (points inside circle ÷ all points). Increasing samples generally improves the estimate, but random variation means convergence is not perfectly monotonic. For responsiveness, the plot draws up to 650 points while the estimate uses every sample.</p></div></div>}
    {tab==='gradient'&&<div className="lab-card"><div className="lab-card-heading"><ChartNoAxesCombined/><div><h3>Gradient descent visualizer</h3><p>Minimize f(w) = (w − 3)². The gradient is 2(w − 3), and the update is w ← w − η × gradient.</p></div></div><div className="lab-controls"><Slider label="Learning rate η" value={lr} min={.01} max={.95} step={.01} onChange={v=>{setLr(v);resetGradient()}}/><div className="lab-button-row"><button className="lab-primary" onClick={()=>setIsPlaying(v=>!v)}><Play size={14}/>{isPlaying?'Pause':'Play animation'}</button><button className="lab-secondary" onClick={stepGradient}>Step once</button><button className="lab-secondary" onClick={()=>{setIsPlaying(false);let x=w;for(let i=0;i<10;i++)x=x-lr*2*(x-3);setW(x);setSteps(s=>s+10)}}>Run 10 steps</button><button className="lab-secondary" onClick={resetGradient}><RotateCcw size={14}/> Reset</button></div></div><div className="gradient-layout"><svg viewBox="0 0 360 220" role="img" aria-label="Quadratic loss curve and current gradient descent position"><line x1="20" y1="190" x2="345" y2="190" stroke="#64738e"/><line x1="25" y1="15" x2="25" y2="195" stroke="#64738e"/><path d={Array.from({length:81},(_,i)=>{const x=-3+i*.15,y=(x-3)**2;return `${i?'L':'M'} ${25+(x+3)*48} ${190-y*5.3}`}).join(' ')} fill="none" stroke="#91a2ff" strokeWidth="2.5"/>{gradientPath.slice(0,Math.min(steps+1,45)).map((x,i)=><circle key={i} cx={25+(x+3)*48} cy={190-(x-3)**2*5.3} r="3" fill="#63d8b3"/>)}<circle cx={25+(w+3)*48} cy={190-(w-3)**2*5.3} r="6" fill="#ffc27a" stroke="#fff" strokeWidth="1.5"/><text x="285" y="210" fill="#9aa8c1" fontSize="10">w</text><text x="7" y="15" fill="#9aa8c1" fontSize="10">loss</text></svg><div className="monte-stats"><Metric label="Current w" value={w.toFixed(4)}/><Metric label="Loss" value={((w-3)**2).toFixed(5)}/><Metric label="Gradient" value={(2*(w-3)).toFixed(4)}/><Metric label="Updates" value={String(steps)}/></div></div><div className="worked-callout"><strong>Learning-rate behavior</strong><p>{lr<.08?'Small steps are stable but may converge slowly.':lr<.5?'This learning rate makes meaningful progress toward the minimum.':'This rate may overshoot or diverge. Watch the plotted updates and loss.'} The minimum is at w = 3 where the gradient is zero.</p></div></div>}
    {tab==='optimizers'&&<div className="lab-card"><div className="lab-card-heading"><ChartNoAxesCombined/><div><h3>Optimizer comparison</h3><p>Compare SGD, momentum and Adam on the same one-dimensional quadratic objective.</p></div></div><svg className="optimizer-chart" viewBox="0 0 520 250" role="img" aria-label="Loss by training step for SGD, momentum and Adam">{[0,1,2,3,4].map(i=><g key={i}><line x1="42" y1={20+i*48} x2="500" y2={20+i*48} stroke="#28364d"/><text x="8" y={24+i*48} fill="#8291aa" fontSize="10">{(40-i*10).toFixed(0)}</text></g>)}{(['sgd','momentum','adam'] as const).map((key,k)=><polyline key={key} fill="none" stroke={['#91a2ff','#5ed8b2','#f4b16e'][k]} strokeWidth="2.5" points={optimizer.map((r,i)=>`${42+i*11.5},${212-clamp(r[key],0,40)*4.8}`).join(' ')}/>)}<text x="450" y="242" fill="#8291aa" fontSize="10">step →</text></svg><div className="plot-legend"><span><i className="legend-a"/>SGD</span><span><i className="legend-b"/>Momentum</span><span><i className="legend-c"/>Adam</span></div><div className="metric-grid"><Metric label="SGD final loss" value={optimizer.at(-1)!.sgd.toFixed(5)}/><Metric label="Momentum final loss" value={optimizer.at(-1)!.momentum.toFixed(5)}/><Metric label="Adam final loss" value={optimizer.at(-1)!.adam.toFixed(5)}/></div><div className="worked-callout"><strong>Interpretation</strong><p>Momentum accumulates a moving direction; Adam adapts step sizes using first and second moment estimates. This is an illustrative toy objective, not a universal optimizer ranking. Hyperparameters and problem geometry change the outcome.</p></div></div>}
    {tab==='python'&&<PythonLab dataset={dataset} setDataset={setDataset}/>}
  </section>
}

function Slider({label,value,min,max,step=1,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void}){
  return <label className="lab-slider"><span>{label}<strong>{value}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>
}
function Metric({label,value,detail}:{label:string;value:string;detail?:string}){
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>
}
function PythonLab({dataset,setDataset}:{dataset:string;setDataset:(v:string)=>void}){
  const rows:{name:string;units?:number;price?:number;region?:string;score?:number;attendance?:number;group?:string}[]=dataset==='sales'?[{name:'Notebook',units:12,price:5,region:'South'},{name:'Pen',units:40,price:2,region:'North'},{name:'Bag',units:7,price:20,region:'South'},{name:'Marker',units:18,price:3,region:'West'}]:[{name:'Asha',score:82,attendance:95,group:'A'},{name:'Ravi',score:56,attendance:72,group:'B'},{name:'Mina',score:91,attendance:98,group:'A'},{name:'Dev',score:68,attendance:85,group:'B'}]
  const total=dataset==='sales'?rows.reduce((n,r)=>n+(r.units??0)*(r.price??0),0):rows.reduce((n,r)=>n+(r.score??0),0)
  const filtered=rows.filter(r=>dataset==='sales'?(r.units??0)>=10:(r.score??0)>=70)
  const passedAverage=filtered.length?filtered.reduce((n,r)=>n+(r.score??0),0)/filtered.length:0
  return <div className="lab-card"><div className="lab-card-heading"><Table2/><div><h3>Python data-processing mini lab</h3><p>Inspect a small dataset, filter rows, derive columns and calculate an aggregate. Then translate the steps into Pandas.</p></div></div><div className="lab-controls"><label className="dataset-select">Dataset<select value={dataset} onChange={e=>setDataset(e.target.value)}><option value="sales">Sales records</option><option value="students">Student scores</option></select></label></div><div className="data-table-wrap"><table className="data-table"><thead><tr>{Object.keys(rows[0]).map(k=><th key={k}>{k}</th>)}{dataset==='sales'&&<th>revenue</th>}</tr></thead><tbody>{rows.map((r)=><tr key={r.name}><td>{r.name}</td>{dataset==='sales'?<><td>{'units' in r?r.units:''}</td><td>{'price' in r?r.price:''}</td><td>{'region' in r?r.region:''}</td><td>{'units' in r?(r.units??0)*(r.price??0):''}</td></>:<><td>{'score' in r?r.score:''}</td><td>{'attendance' in r?r.attendance:''}</td><td>{'group' in r?r.group:''}</td></>}</tr>)}</tbody></table></div><div className="metric-grid"><Metric label="Rows loaded" value={String(rows.length)}/><Metric label="Rows after filter" value={String(filtered.length)}/><Metric label={dataset==='sales'?'Total revenue':'Passed average score'} value={dataset==='sales'?String(total):passedAverage.toFixed(1)}/></div><div className="python-task"><strong>Your exercise</strong><p>{dataset==='sales'?'Filter products with at least 10 units, calculate revenue = units × price, then group revenue by region.':'Filter students scoring at least 70, calculate the average score and identify the highest-scoring student.'}</p><pre><code>{dataset==='sales'?"df['revenue'] = df['units'] * df['price']\nresult = df[df['units'] >= 10]\nresult.groupby('region')['revenue'].sum()":"passed = df[df['score'] >= 70]\npassed['score'].mean()\ndf.loc[df['score'].idxmax(), 'name']"}</code></pre><p className="hint">Hint: Perform filtering before aggregation. In Pandas, boolean masks select rows and groupby creates grouped summaries.</p></div></div>
}
