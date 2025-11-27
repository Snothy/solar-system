import { useState } from 'react';
import { fetchBodyData } from '../../services/jplHorizons';
import styles from './SearchPanel.module.css';

interface SearchPanelProps {
  onAddBody: (data: any) => void;
}

export function SearchPanel({ onAddBody }: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    try {
      // Fetch data for the body (using current date)
      const data = await fetchBodyData(searchTerm);
      
      // Enhance data with name from search term (or we could parse it)
      const enhancedData = {
        ...data,
        name: searchTerm, // We might want to parse the real name from result
        // Default visuals
        color: Math.random() * 0xffffff,
        texture: '', // No texture by default
        type: 'asteroid' // Default type
      };

      setSearchResult(enhancedData);
    } catch (err) {
      console.error("Search failed", err);
      setError("Body not found or JPL API error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = () => {
    if (searchResult) {
      onAddBody(searchResult);
      setSearchResult(null);
      setSearchTerm('');
    }
  };

  return (
    <div className={styles.searchPanel}>
      <div className={styles.sectionTitle}>Add New Body</div>
      <div className={styles.inputGroup}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="JPL ID (e.g., 499)"
          className={styles.searchInput}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className={styles.searchBtn}
        >
          {isSearching ? '...' : '🔍'}
        </button>
      </div>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {searchResult && (
        <div className={styles.resultCard}>
          <div className={styles.resultInfo}>
            <span className={styles.resultName}>{searchResult.name}</span>
            <span className={styles.resultDetail}>
              R: {(searchResult.radius / 1000).toFixed(1)} km
            </span>
          </div>
          <button onClick={handleAdd} className={styles.addBtn}>
            Add to Sim
          </button>
        </div>
      )}
    </div>
  );
}
