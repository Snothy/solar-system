interface PhysicsSettingsProps {
  enableTidalEvolution: boolean;
  enableAtmosphericDrag: boolean;
  enableYarkovsky: boolean;
  enablePrecession: boolean;
  enableNutation: boolean;
  useTDBTime: boolean;
  enableLightAberration: boolean;
  useLightTimeDelay: boolean;
  onToggleTidalEvolution: (enabled: boolean) => void;
  onToggleAtmosphericDrag: (enabled: boolean) => void;
  onToggleYarkovsky: (enabled: boolean) => void;
  onTogglePrecession: (enabled: boolean) => void;
  onToggleNutation: (enabled: boolean) => void;
  onToggleTDBTime: (enabled: boolean) => void;
  onToggleLightAberration: (enabled: boolean) => void;
  onToggleLightTimeDelay: (enabled: boolean) => void;
  enableRelativity: boolean;
  useAdaptiveTimeStep: boolean;
  onToggleRelativity: (enabled: boolean) => void;
  onToggleAdaptiveTimeStep: (enabled: boolean) => void;
}

export function PhysicsSettings({
  enableTidalEvolution,
  enableAtmosphericDrag,
  enableYarkovsky,
  enablePrecession,
  enableNutation,
  useTDBTime,
  enableLightAberration,
  useLightTimeDelay,
  onToggleTidalEvolution,
  onToggleAtmosphericDrag,
  onToggleYarkovsky,
  onTogglePrecession,
  onToggleNutation,
  onToggleTDBTime,
  onToggleLightAberration,
  onToggleLightTimeDelay,
  enableRelativity,
  useAdaptiveTimeStep,
  onToggleRelativity,
  onToggleAdaptiveTimeStep
}: PhysicsSettingsProps) {
  return (
    <div className="p-4 border-b border-white/10">
      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">
        Advanced Physics
      </h3>
      
      <div className="space-y-2">
        {/* Visual Effects */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Visual</div>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={useLightTimeDelay}
              onChange={(e) => onToggleLightTimeDelay(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Light-Time Delay</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enableLightAberration}
              onChange={(e) => onToggleLightAberration(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Light Aberration</span>
          </label>
        </div>

        {/* Core Physics */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Gravitational</div>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enableTidalEvolution}
              onChange={(e) => onToggleTidalEvolution(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Tidal Evolution</span>
            <span className="text-[10px] text-gray-500">(Moon recession)</span>
          </label>
        </div>

        {/* Integration & Accuracy */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Precision</div>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={useAdaptiveTimeStep}
              onChange={(e) => onToggleAdaptiveTimeStep(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Adaptive Time-Stepping</span>
            <span className="text-[10px] text-gray-500">(RKF45)</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enableRelativity}
              onChange={(e) => onToggleRelativity(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>General Relativity</span>
            <span className="text-[10px] text-gray-500">(EIH)</span>
          </label>
        </div>

        {/* Environmental */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Environmental</div>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enableAtmosphericDrag}
              onChange={(e) => onToggleAtmosphericDrag(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Atmospheric Drag</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enableYarkovsky}
              onChange={(e) => onToggleYarkovsky(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Yarkovsky Effect</span>
            <span className="text-[10px] text-gray-500">(Asteroids)</span>
          </label>
        </div>

        {/* Rotational */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Rotational</div>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enablePrecession}
              onChange={(e) => onTogglePrecession(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Axial Precession</span>
            <span className="text-[10px] text-gray-500">(26kyr)</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={enableNutation}
              onChange={(e) => onToggleNutation(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>Nutation</span>
            <span className="text-[10px] text-gray-500">(18.6yr)</span>
          </label>
        </div>

        {/* Time */}
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Time Scale</div>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={useTDBTime}
              onChange={(e) => onToggleTDBTime(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <span>TDB Time</span>
            <span className="text-[10px] text-gray-500">(Barycentric)</span>
          </label>
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-blue-900/20 rounded text-[10px] text-blue-300">
        💡 All features use research-grade physics for 1:1 accuracy
      </div>
    </div>
  );
}
