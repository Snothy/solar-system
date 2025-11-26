import React, { useState, useEffect, useRef } from 'react';
import { SOLAR_SYSTEM_DATA } from '../../data/solarSystem';
import { fetchBodyData } from '../../services/jplHorizons';
import { saveTexture, saveTextureSelection, getAllTextures, getAllTextureSelections, deleteTexture, deleteTextureSelection } from '../../services/textureStorage';
import type { CelestialBodyData } from '../../types';
import './SetupScreen.css';

interface SetupScreenProps {
  onSimulationStart: (data: any[]) => void;
}

interface FetchStatus {
  status: 'pending' | 'loading' | 'complete' | 'error';
  error?: string;
}

interface TextureSelection {
  [bodyName: string]: string; // 'default' or custom texture name
}

export function SetupScreen({ onSimulationStart }: SetupScreenProps) {
  const [fetchStatuses, setFetchStatuses] = useState<Record<string, FetchStatus>>({});
  const [fetchedData, setFetchedData] = useState<any[]>([]);
  const [selectedBody, setSelectedBody] = useState<CelestialBodyData | null>(null);
  const [customTextures, setCustomTextures] = useState<any[]>([]);
  const [textureSelections, setTextureSelections] = useState<TextureSelection>({});
  const [isFetching, setIsFetching] = useState(false);
  const [previewTexture, setPreviewTexture] = useState<{ url: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize statuses
    const initialStatuses: Record<string, FetchStatus> = {};
    SOLAR_SYSTEM_DATA.forEach(body => {
      initialStatuses[body.name] = { status: 'pending' };
    });
    setFetchStatuses(initialStatuses);

    // Load stored textures
    loadStoredTextures();
  }, []);

  const loadStoredTextures = async () => {
    try {
      const textures = await getAllTextures();
      setCustomTextures(textures);
      
      const selections = await getAllTextureSelections();
      const selectionMap: TextureSelection = {};
      selections.forEach(s => {
        selectionMap[s.bodyName] = s.textureId;
      });
      setTextureSelections(selectionMap);
    } catch (err) {
      console.error("Failed to load stored textures", err);
    }
  };

  const startFetching = async () => {
    setIsFetching(true);
    const bodiesToFetch = SOLAR_SYSTEM_DATA.filter(d => d.jplId);
    const results: any[] = [];
    let completed = 0;

    const updateStatus = (name: string, status: FetchStatus['status'], error?: string) => {
      setFetchStatuses(prev => ({
        ...prev,
        [name]: { status, error }
      }));
    };

    for (const body of bodiesToFetch) {
      updateStatus(body.name, 'loading');
      
      try {
        const jplData = await fetchBodyData(body.jplId!);
        
        const mergedData = {
          ...body,
          pos: jplData.pos,
          vel: jplData.vel,
          mass: jplData.mass || body.mass || 0,
          radius: jplData.radius || body.radius || 1000,
          rotationPeriod: jplData.rotationPeriod || body.rotationPeriod || 0,
          meanTemperature: jplData.meanTemperature || body.meanTemperature || 0,
          axialTilt: jplData.axialTilt || body.axialTilt || 0,
          surfaceGravity: jplData.surfaceGravity || body.surfaceGravity || 0
        };
        
        results.push(mergedData);
        updateStatus(body.name, 'complete');
      } catch (e) {
        console.warn(`Failed to fetch ${body.name}`, e);
        updateStatus(body.name, 'error', 'Failed to fetch');
      }
      
      completed++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setFetchedData(results);
    setIsFetching(false);
  };

  const handleTextureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBody || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const textureName = `${selectedBody.name}_${Date.now()}`; 
    
    try {
      await saveTexture(textureName, file);
      await saveTextureSelection(selectedBody.name, textureName);
      await loadStoredTextures();
      setTextureSelections(prev => ({
        ...prev,
        [selectedBody.name]: textureName
      }));
    } catch (err) {
      console.error("Failed to save texture", err);
    }
  };

  const handleTextureSelect = async (textureId: string) => {
    if (!selectedBody) return;
    
    await saveTextureSelection(selectedBody.name, textureId);
    setTextureSelections(prev => ({
      ...prev,
      [selectedBody.name]: textureId
    }));
  };

  const handleTextureDelete = async (textureName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedBody) return;

    if (confirm('Are you sure you want to delete this texture?')) {
      try {
        await deleteTexture(textureName);
        
        // If the deleted texture was selected, revert to default
        if (textureSelections[selectedBody.name] === textureName) {
          await deleteTextureSelection(selectedBody.name);
          setTextureSelections(prev => {
            const next = { ...prev };
            delete next[selectedBody.name];
            return next;
          });
        }
        
        await loadStoredTextures();
      } catch (err) {
        console.error("Failed to delete texture", err);
      }
    }
  };

  const getBodyTexture = (bodyName: string) => {
    const selection = textureSelections[bodyName];
    if (selection && selection !== 'default') {
      const custom = customTextures.find(t => t.name === selection);
      if (custom) {
        return URL.createObjectURL(custom.blob);
      }
    }
    const body = SOLAR_SYSTEM_DATA.find(b => b.name === bodyName);
    return body?.texture || '';
  };

  const handleStartSimulation = () => {
    const finalData = fetchedData.map(d => {
      const selection = textureSelections[d.name];
      let textureUrl = d.texture;
      
      if (selection && selection !== 'default') {
        const custom = customTextures.find(t => t.name === selection);
        if (custom) {
          textureUrl = URL.createObjectURL(custom.blob);
        }
      }
      
      return {
        ...d,
        texture: textureUrl
      };
    });
    
    onSimulationStart(finalData);
  };

  // Organize bodies hierarchically
  const organizedBodies = React.useMemo(() => {
    const parents = SOLAR_SYSTEM_DATA.filter(b => !b.parent);
    const result: CelestialBodyData[] = [];
    
    parents.forEach(parent => {
      result.push(parent);
      const moons = SOLAR_SYSTEM_DATA.filter(b => b.parent === parent.name);
      result.push(...moons);
    });
    
    return result;
  }, []);

  const allComplete = Object.values(fetchStatuses).every(s => s.status === 'complete' || s.status === 'error') && fetchedData.length > 0;

  return (
    <div className="setup-container">
      <div className="setup-header">
        <div className="setup-title">
          <h1>Solar System Setup</h1>
          <p>Initialize simulation data and customize visuals</p>
        </div>
        <div className="setup-actions">
          {!isFetching && fetchedData.length === 0 && (
            <button 
              onClick={startFetching}
              className="btn btn-primary"
            >
              Fetch Data
            </button>
          )}
          <button 
            onClick={handleStartSimulation}
            disabled={!allComplete}
            className={`btn ${allComplete ? 'btn-success' : 'btn-disabled'}`}
          >
            Start Simulation
          </button>
        </div>
      </div>

      <div className="setup-content">
        {/* Left Panel: Body List & Status */}
        <div className="body-list-panel">
          <h2 className="panel-title">Celestial Bodies</h2>
          <div className="body-list">
            {organizedBodies.map(body => (
              <div 
                key={body.name}
                onClick={() => setSelectedBody(body)}
                className={`body-item ${selectedBody?.name === body.name ? 'selected' : ''} ${body.parent ? 'is-moon' : ''}`}
              >
                <div className="body-item-header">
                  <div className="body-item-content">
                    <div className="body-list-avatar">
                      <img 
                        src={getBodyTexture(body.name)} 
                        alt={body.name}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32?text=?';
                        }}
                      />
                    </div>
                    <span className="body-name">{body.name}</span>
                  </div>
                  <span className={`status-badge status-${fetchStatuses[body.name]?.status}`}>
                    {fetchStatuses[body.name]?.status}
                  </span>
                </div>
                {fetchStatuses[body.name]?.status === 'loading' && (
                   <div className="progress-bar">
                     <div className="progress-fill"></div>
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Details & Texture Management */}
        <div className="body-details-panel">
          {selectedBody ? (
            <div className="details-container">
              <div className="body-header">
                <div className="body-avatar">
                  <img 
                    src={getBodyTexture(selectedBody.name)} 
                    alt={selectedBody.name}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=?';
                    }}
                  />
                </div>
                <div className="body-info">
                  <h2>{selectedBody.name}</h2>
                  <p className="body-type">{(selectedBody.type || 'unknown').charAt(0).toUpperCase() + (selectedBody.type || 'unknown').slice(1)}</p>
                </div>
              </div>

              <div className="section-card">
                <h3 className="section-title">
                  <span className="accent-bar"></span>
                  Texture Management
                </h3>
                
                <div className="texture-grid">
                  {/* Default Texture Option */}
                  <div 
                    onClick={() => handleTextureSelect('default')}
                    className={`texture-option ${(!textureSelections[selectedBody.name] || textureSelections[selectedBody.name] === 'default') ? 'selected' : ''}`}
                  >
                    <img 
                      src={selectedBody.texture} 
                      alt="Default" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTexture({ url: selectedBody.texture || '', name: 'Default' });
                      }}
                    />
                    <div className="texture-label">Default</div>
                    {(!textureSelections[selectedBody.name] || textureSelections[selectedBody.name] === 'default') && (
                      <div className="check-badge">✓</div>
                    )}
                  </div>

                  {/* Custom Textures */}
                  {customTextures.filter(t => t.name.startsWith(selectedBody.name)).map(texture => {
                    const url = URL.createObjectURL(texture.blob);
                    return (
                      <div 
                        key={texture.name}
                        onClick={() => handleTextureSelect(texture.name)}
                        className={`texture-option ${textureSelections[selectedBody.name] === texture.name ? 'selected' : ''}`}
                      >
                        <img 
                          src={url} 
                          alt="Custom" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTexture({ url, name: 'Custom' });
                          }}
                        />
                        <div className="texture-label">Custom</div>
                        {textureSelections[selectedBody.name] === texture.name && (
                          <div className="check-badge">✓</div>
                        )}
                        <button 
                          className="delete-btn"
                          onClick={(e) => handleTextureDelete(texture.name, e)}
                          title="Delete Texture"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  {/* Upload New */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-box"
                  >
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span>Upload New</span>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleTextureUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Body Characteristics */}
              <div className="section-card">
                <h3 className="section-title">
                  <span className="accent-bar"></span>
                  Body Characteristics
                </h3>
                <div className="stats-grid">
                  <div className="stat-row">
                    <span className="stat-label">Mass</span>
                    <span className="stat-value">
                      {(fetchedData.find(d => d.name === selectedBody.name)?.mass || selectedBody.mass).toExponential(2)} kg
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Radius</span>
                    <span className="stat-value">
                      {((fetchedData.find(d => d.name === selectedBody.name)?.radius || selectedBody.radius) / 1000).toLocaleString()} km
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Rotation Period</span>
                    <span className="stat-value">
                      {(fetchedData.find(d => d.name === selectedBody.name)?.rotationPeriod || selectedBody.rotationPeriod).toFixed(2)} h
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Axial Tilt</span>
                    <span className="stat-value">
                      {(fetchedData.find(d => d.name === selectedBody.name)?.axialTilt || selectedBody.axialTilt).toFixed(2)}°
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Mean Temp</span>
                    <span className="stat-value">
                      {fetchedData.find(d => d.name === selectedBody.name)?.meanTemperature || selectedBody.meanTemperature || 'N/A'} K
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Surface Gravity</span>
                    <span className="stat-value">
                      {(fetchedData.find(d => d.name === selectedBody.name)?.surfaceGravity || selectedBody.surfaceGravity || 0).toFixed(2)} m/s²
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Preview (Optional) */}
              {fetchedData.find(d => d.name === selectedBody.name) && (
                 <div className="section-card">
                   <h3 className="section-title">
                     <span className="accent-bar"></span>
                     Fetched Data
                   </h3>
                   <div className="stats-grid">
                     {Object.entries(fetchedData.find(d => d.name === selectedBody.name) || {}).map(([key, value]) => {
                        if (key === 'pos' || key === 'vel' || typeof value === 'object') return null;
                        return (
                          <div key={key} className="stat-row">
                            <span className="stat-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="stat-value">{String(value).substring(0, 10)}</span>
                          </div>
                        );
                     })}
                   </div>
                 </div>
              )}

            </div>
          ) : (
            <div className="empty-state">
              <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p>Select a celestial body to customize</p>
            </div>
          )}
        </div>
      </div>

      {/* Texture Preview Modal */}
      {previewTexture && (
        <div className="modal-overlay" onClick={() => setPreviewTexture(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewTexture(null)}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="modal-title">{previewTexture.name} Texture</h3>
            <img src={previewTexture.url} alt="Preview" className="modal-image" />
          </div>
        </div>
      )}
    </div>
  );
}
