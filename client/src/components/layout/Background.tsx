import { useEffect, useRef } from 'react'

export default function Background() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    for (let i = 0; i < 55; i++) {
      const sf = document.createElement('div')
      const size = Math.random() * 3.5 + 1
      sf.style.cssText = `
        position:absolute; border-radius:50%;
        background:rgba(255,255,255,0.85);
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        animation: snowfall ${Math.random() * 12 + 7}s linear ${Math.random() * 12}s infinite;
        opacity:${Math.random() * 0.55 + 0.2};
      `
      container.appendChild(sf)
    }
    return () => { container.innerHTML = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Sky */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0a1628 0%, #112240 18%, #1a3a60 35%, #2e6090 50%, #4a8ab5 62%, #7ab5d8 72%, #b8d8ee 80%, #ddeef8 88%, #eef5fb 100%)',
        }}
      />
      {/* Light rays */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-3/4 pointer-events-none"
        style={{
          background: 'conic-gradient(from 265deg at 50% 0%, transparent 0deg, rgba(255,240,200,0.025) 5deg, transparent 10deg, rgba(255,240,200,0.018) 16deg, transparent 22deg, rgba(255,240,200,0.03) 27deg, transparent 33deg)',
        }}
      />
      {/* Snowflakes */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
      {/* Mountains SVG */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 480"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full block"
        >
          {/* Far range */}
          <path fill="rgba(28,58,108,0.5)" d="M0,480 L0,310 L90,270 L190,305 L290,220 L390,262 L470,172 L555,235 L635,155 L715,208 L795,122 L875,185 L955,105 L1035,168 L1115,95 L1195,158 L1275,118 L1360,175 L1440,135 L1440,480Z" />
          <path fill="rgba(215,232,248,0.4)" d="M470,172 L500,193 L530,178 L555,235 Z M635,155 L665,174 L695,160 L715,208 Z M795,122 L826,143 L856,129 L875,185 Z M955,105 L988,128 L1018,112 L1035,168 Z M1115,95 L1148,118 L1178,103 L1195,158 Z" />
          {/* Mid range */}
          <path fill="rgba(15,42,82,0.72)" d="M0,480 L0,370 L70,352 L150,378 L230,318 L330,350 L415,280 L515,318 L598,248 L682,296 L760,228 L842,272 L920,208 L1000,255 L1082,198 L1164,242 L1244,218 L1324,254 L1404,230 L1440,242 L1440,480Z" />
          <path fill="rgba(235,246,255,0.5)" d="M230,318 L265,335 L300,320 L330,350 Z M415,280 L448,297 L480,283 L515,318 Z M598,248 L633,266 L666,252 L682,296 Z M760,228 L795,246 L828,232 L842,272 Z M920,208 L956,228 L988,213 L1000,255 Z M1082,198 L1118,218 L1150,204 L1164,242 Z" />
          {/* Front range */}
          <path fill="rgba(6,16,34,0.94)" d="M0,480 L0,424 L65,413 L138,432 L212,388 L295,412 L378,358 L462,394 L545,338 L628,376 L710,322 L793,360 L876,306 L958,344 L1040,292 L1122,330 L1204,286 L1286,322 L1368,296 L1440,314 L1440,480Z" />
          <path fill="rgba(252,253,255,0.95)" d="M212,388 L244,404 L276,390 L295,412 Z M378,358 L412,375 L445,361 L462,394 Z M545,338 L580,356 L613,342 L628,376 Z M710,322 L746,340 L779,326 L793,360 Z M876,306 L912,325 L945,311 L958,344 Z M1040,292 L1076,312 L1109,297 L1122,330 Z M1204,286 L1240,306 L1273,292 L1286,322 Z" />
          {/* Snow drifts */}
          <path fill="rgba(225,240,255,0.3)" d="M0,480 L0,462 Q180,448 360,458 Q540,468 720,452 Q900,436 1080,450 Q1260,464 1440,448 L1440,480Z" />
          <path fill="rgba(255,255,255,0.13)" d="M0,480 L0,472 Q360,464 720,474 Q1080,484 1440,470 L1440,480Z" />
        </svg>
      </div>
    </div>
  )
}
