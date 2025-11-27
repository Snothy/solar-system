/**
 * Hook to manage performance monitoring
 */

import { useRef, useMemo } from 'react';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

export function usePhysicsCompute() {
  const performanceRef = useRef(new PerformanceMonitor());

  return useMemo(() => ({
    getPerformanceMetrics: () => performanceRef.current.getMetrics(),
    performanceMonitor: performanceRef.current
  }), []);
}
