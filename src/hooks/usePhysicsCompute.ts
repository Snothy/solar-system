/**
 * Hook to manage performance monitoring
 */

import { useRef } from 'react';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

export function usePhysicsCompute() {
  const performanceRef = useRef(new PerformanceMonitor());

  /**
   * Get current performance metrics
   */
  const getPerformanceMetrics = () => {
    return performanceRef.current.getMetrics();
  };

  return {
    getPerformanceMetrics,
    performanceMonitor: performanceRef.current
  };
}
