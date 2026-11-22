import { useMemo, useState } from 'react'

type Props = { topicId: string }

const clamp = (value:number,min:number,max:number) => Math.max(min,Math.min(max,value))
const Field = ({label,value,min,max,step=0.1,onChange}:{label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void}) => <label className="foundation-field"><span>{label}<strong>{value.toFixed(2)}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></label>

export default function FoundationTopicLab({topicId}:Props) {
  const [ax,setAx]=useState(2),[ay,setAy]=useState(3),[bx,setBx]=useState(4),[by,setBy]=useState(1)
  const [prevalence,setPrevalence]=useState(.2),[sensitivity,setSensitivity]=useState(.8),[specificity,setSpecificity]=useState(.9)
  const [w,setW]=useState(0),[target,setTarget]=useState(3),[epsilon,setEpsilon]=useState(.01)
  const [rate,setRate]=useState(.1),[iterations,setIterations]=useState(8)
  const [missingPolicy,setMissingPolicy]=useState<'reject'|'impute'|'preserve'>('reject')
  const [arrayThreshold,setArrayThreshold]=useState(3)
  const [leakageFeature,setLeakageFeature]=useState(true),[hasDuplicate,setHasDuplicate]=useState(false),[hasMissing,setHasMissing]=useState(true)
  const dot=ax*bx+ay*by
  const cosine=dot/(Math.hypot(ax,ay)*Math.hypot(bx,by)||1)
  const truePositive=prevalence*sensitivity
  const falsePositive=(1-prevalence)*(1-specificity)
  const posterior=truePositive/(truePositive+falsePositive||1)
  const loss=(x:number)=>(x-target)**2
  const derivative=2*(w-target)
  const finiteDifference=(loss(w+epsilon)-loss(w-epsilon))/(2*epsilon)
  const trajectory=useMemo(()=>{
    let value=w
    const rows=[{step:0,w:value,loss:loss(value)}]
    for(let i=1;i<=iterations;i++){value-=rate*2*(value-target);rows.push({step:i,w:value,loss:loss(value)})}
    return rows
  },[w,target,rate,iterations])
  if(topicId==='vectors') return <section className="foundation-lab">
    <div className="foundation-lab-heading"><span>NUMERICAL PLAYGROUND · LINEAR ALGEBRA</span><h4>Vector dot product & alignment</h4><p>Change vector coordinates. The dot product multiplies corresponding components and adds them; cosine similarity normalizes that score to measure direction.</p></div>
    <div className="foundation-controls"><Field label="Vector a · x" value={ax} min={-5} max={5} onChange={setAx}/><Field label="Vector a · y" value={ay} min={-5} max={5} onChange={setAy}/><Field label="Vector b · x" value={bx} min={-5} max={5} onChange={setBx}/><Field label="Vector b · y" value={by} min={-5} max={5} onChange={setBy}/></div>
    <div className="foundation-metrics"><div><small>DOT PRODUCT</small><strong>{dot.toFixed(3)}</strong><code>{ax.toFixed(1)}×{bx.toFixed(1)} + {ay.toFixed(1)}×{by.toFixed(1)}</code></div><div><small>COSINE SIMILARITY</small><strong>{cosine.toFixed(3)}</strong><code>dot(a,b) / (||a|| · ||b||)</code></div><div><small>INTERPRETATION</small><strong>{cosine>.05?'Aligned':cosine<-.05?'Opposed':'Orthogonal'}</strong><code>Sign and magnitude describe orientation</code></div></div>
    <p className="foundation-note">Shape check: a and b are both 2-dimensional vectors. A dot product requires equal vector lengths; matrix multiplication additionally requires the left matrix's column count to equal the right matrix's row count.</p>
  </section>
  if(topicId==='probability') return <section className="foundation-lab">
    <div className="foundation-lab-heading"><span>NUMERICAL PLAYGROUND · BAYES' RULE</span><h4>Base-rate and diagnostic test simulator</h4><p>Model a population, a test's sensitivity and specificity. Observe why a positive result is not the same as certainty that the condition is present.</p></div>
    <div className="foundation-controls"><Field label="Prevalence / prior" value={prevalence} min={.01} max={.9} step={.01} onChange={setPrevalence}/><Field label="Sensitivity P(+ | condition)" value={sensitivity} min={.01} max={1} step={.01} onChange={setSensitivity}/><Field label="Specificity P(− | no condition)" value={specificity} min={.01} max={1} step={.01} onChange={setSpecificity}/></div>
    <div className="foundation-metrics"><div><small>TRUE-POSITIVE RATE IN POPULATION</small><strong>{(truePositive*100).toFixed(2)}%</strong><code>prior × sensitivity</code></div><div><small>FALSE-POSITIVE RATE IN POPULATION</small><strong>{(falsePositive*100).toFixed(2)}%</strong><code>(1 − prior) × (1 − specificity)</code></div><div><small>POSTERIOR P(CONDITION | +)</small><strong>{(posterior*100).toFixed(1)}%</strong><code>TP / (TP + FP)</code></div></div>
    <div className="foundation-bar" aria-label="Composition of positive test results"><span style={{width:`${posterior*100}%`}}/><i style={{width:`${(1-posterior)*100}%`}}/></div><p className="foundation-note">Among all positive results, {(posterior*100).toFixed(1)}% are true positives under these assumptions. The remaining {(100-posterior*100).toFixed(1)}% are false positives. This is a mathematical teaching example, not medical guidance.</p>
  </section>
  if(topicId==='calculus') return <section className="foundation-lab">
    <div className="foundation-lab-heading"><span>NUMERICAL PLAYGROUND · DIFFERENTIATION</span><h4>Analytic gradient vs finite differences</h4><p>For f(w) = (w − target)², the exact derivative is 2(w − target). The central-difference estimate approximates the slope using nearby function values.</p></div>
    <div className="foundation-controls"><Field label="Parameter w" value={w} min={-3} max={7} step={.1} onChange={setW}/><Field label="Target / minimum" value={target} min={-3} max={7} step={.1} onChange={setTarget}/><Field label="Finite-difference ε" value={epsilon} min={.001} max={.5} step={.001} onChange={v=>setEpsilon(clamp(v,.001,.5))}/></div>
    <div className="foundation-metrics"><div><small>FUNCTION VALUE</small><strong>{loss(w).toFixed(4)}</strong><code>f(w) = (w − target)²</code></div><div><small>ANALYTIC DERIVATIVE</small><strong>{derivative.toFixed(4)}</strong><code>2(w − target)</code></div><div><small>CENTRAL DIFFERENCE</small><strong>{finiteDifference.toFixed(4)}</strong><code>[f(w+ε) − f(w−ε)] / 2ε</code></div></div>
    <p className="foundation-note">Absolute estimation error: {Math.abs(derivative-finiteDifference).toExponential(3)}. Very large ε measures a wider secant; extremely small ε can amplify floating-point cancellation.</p>
  </section>
  if(topicId==='python-core') return <section className="foundation-lab">
    <div className="foundation-lab-heading"><span>INTERACTIVE PLAYGROUND · PYTHON DATA PIPELINE</span><h4>Parse, validate and handle missing values</h4><p>Inspect a tiny batch of incoming records. Choose an explicit missing-value policy and see which rows are accepted, transformed or rejected.</p></div>
    <div className="foundation-controls"><label className="foundation-field"><span>Missing-value policy</span><select value={missingPolicy} onChange={e=>setMissingPolicy(e.target.value as 'reject'|'impute'|'preserve')}><option value="reject">Reject invalid rows</option><option value="impute">Impute numeric missing values</option><option value="preserve">Preserve as null for downstream handling</option></select></label></div>
    <div className="foundation-metrics"><div><small>INPUT RECORDS</small><strong>5</strong><code>id, amount, region</code></div><div><small>ACCEPTED RECORDS</small><strong>{missingPolicy==='reject'?3:5}</strong><code>{missingPolicy==='impute'?'2 values imputed':missingPolicy==='preserve'?'2 nulls retained':'2 rows rejected'}</code></div><div><small>VALIDATION STATUS</small><strong>{missingPolicy==='reject'?'2 rejected':'5 accepted'}</strong><code>Schema + required-field check</code></div></div>
    <p className="foundation-note">Example input: [{'{'}id:1, amount:120{'}'}, {'{'}id:2, amount:null{'}'}, {'{'}id:3, amount:85{'}'}, {'{'}id:4, amount:null{'}'}, {'{'}id:5, amount:210{'}'}]. Imputation uses the observed numeric mean (138.33). In a real pipeline, define whether imputation is fit on training data only and persist the transformation parameters.</p>
  </section>
  if(topicId==='numpy-pandas') return <section className="foundation-lab">
    <div className="foundation-lab-heading"><span>INTERACTIVE PLAYGROUND · ARRAY TRANSFORMATIONS</span><h4>Vectorized filtering, aggregation and normalization</h4><p>Apply a threshold to a small numeric column. The same operation runs across the array without a Python-level row loop.</p></div>
    <div className="foundation-controls"><Field label="Filter threshold" value={arrayThreshold} min={0} max={10} step={1} onChange={v=>setArrayThreshold(Math.round(v))}/></div>
    <div className="foundation-metrics"><div><small>INPUT ARRAY</small><strong>[1, 2, 3, 4, 5, 6]</strong><code>six numeric observations</code></div><div><small>FILTERED VALUES</small><strong>[{[1,2,3,4,5,6].filter(v=>v>=arrayThreshold).join(', ')}]</strong><code>value ≥ {arrayThreshold}</code></div><div><small>FILTERED MEAN</small><strong>{([1,2,3,4,5,6].filter(v=>v>=arrayThreshold).reduce((a,b)=>a+b,0)/([1,2,3,4,5,6].filter(v=>v>=arrayThreshold).length||1)).toFixed(2)}</strong><code>mean of selected rows</code></div></div>
    <p className="foundation-note">Vectorization applies an operation to an entire array. In Pandas, boolean masks select rows; groupby aggregates by keys; joins combine tables by explicit key relationships. Always check null handling, dtypes, duplicate keys and join cardinality.</p>
  </section>
  if(topicId==='data-quality') return <section className="foundation-lab">
    <div className="foundation-lab-heading"><span>INTERACTIVE PLAYGROUND · DATA QUALITY & LEAKAGE</span><h4>Dataset quality gate</h4><p>Toggle defects in a training dataset. The gate should block unsafe training until data quality and temporal split checks pass.</p></div>
    <div className="foundation-controls"><label className="foundation-field"><span><input type="checkbox" checked={hasMissing} onChange={e=>setHasMissing(e.target.checked)}/> Missing required values</span></label><label className="foundation-field"><span><input type="checkbox" checked={hasDuplicate} onChange={e=>setHasDuplicate(e.target.checked)}/> Duplicate record IDs</span></label><label className="foundation-field"><span><input type="checkbox" checked={leakageFeature} onChange={e=>setLeakageFeature(e.target.checked)}/> Feature timestamp occurs after prediction time</span></label></div>
    <div className="foundation-metrics"><div><small>SCHEMA CHECK</small><strong>{hasMissing?'FAIL':'PASS'}</strong><code>{hasMissing?'Required field is null':'Required fields present'}</code></div><div><small>UNIQUENESS CHECK</small><strong>{hasDuplicate?'FAIL':'PASS'}</strong><code>{hasDuplicate?'Duplicate primary key':'IDs are unique'}</code></div><div><small>TEMPORAL LEAKAGE CHECK</small><strong>{leakageFeature?'FAIL':'PASS'}</strong><code>{leakageFeature?'Feature is from the future':'Feature available at prediction time'}</code></div></div>
    <p className="foundation-note">Training gate: {hasMissing||hasDuplicate||leakageFeature?'BLOCKED — resolve all failing checks before fitting.':'PASSED — this fixture satisfies the enabled checks.'} Fit imputers, scalers, feature selectors and encoders on the training partition only; then apply the learned transforms to validation and test data.</p>
  </section>
  if(topicId==='optimization') return <section className="foundation-lab">
    <div className="foundation-lab-heading"><span>NUMERICAL PLAYGROUND · GRADIENT DESCENT</span><h4>Learning-rate trajectory simulator</h4><p>Minimize f(w) = (w − target)². Each update subtracts learning-rate × gradient. Compare slow convergence, useful progress and divergence.</p></div>
    <div className="foundation-controls"><Field label="Learning rate η" value={rate} min={.01} max={1.1} step={.01} onChange={setRate}/><Field label="Target / minimum" value={target} min={-3} max={7} step={.1} onChange={setTarget}/><Field label="Iterations" value={iterations} min={1} max={20} step={1} onChange={v=>setIterations(Math.round(v))}/><Field label="Starting parameter" value={w} min={-3} max={7} step={.1} onChange={setW}/></div>
    <div className="foundation-metrics"><div><small>FINAL PARAMETER</small><strong>{trajectory.at(-1)?.w.toFixed(4)}</strong><code>after {iterations} updates</code></div><div><small>FINAL LOSS</small><strong>{trajectory.at(-1)?.loss.toExponential(3)}</strong><code>target loss = 0</code></div><div><small>BEHAVIOR</small><strong>{trajectory.at(-1)!.loss<trajectory[0].loss?'Loss reduced':'Loss did not improve'}</strong><code>{rate<.25?'Conservative step size':rate<.5?'Moderate step size':'Large step size; inspect stability'}</code></div></div>
    <div className="foundation-trajectory">{trajectory.map(row=><div key={row.step} className="foundation-trajectory-row"><span>{row.step===0?'Start':`Step ${row.step}`}</span><div><i style={{width:`${clamp(100/(1+row.loss),1,100)}%`}}/></div><strong>{row.loss.toFixed(4)}</strong><small>w={row.w.toFixed(3)}</small></div>)}</div>
    <p className="foundation-note">For this quadratic, η = 0.5 reaches the minimum in one update from any starting point. Larger than 0.5 overshoots; η ≥ 1 fails to contract the error. Try η = 1.05 and observe divergence.</p>
  </section>
  return null
}
