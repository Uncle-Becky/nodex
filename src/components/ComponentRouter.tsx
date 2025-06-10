import React, { useEffect, useState } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { BusEvent } from '../types/bus';
import type { ComponentRoute } from '../types/components';
import { eventBus } from '../utils/eventBus';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ApiKeySettings } from './ApiKeySettings';
import { NodePalette } from './NodePalette';

export const ComponentRouter: React.FC = () => {
  const [routes, setRoutes] = useState<ComponentRoute[]>([
    {
      id: 'analytics',
      path: '/analytics',
      component: AnalyticsDashboard,
      isVisible: false,
    },
    {
      id: 'apiSettings',
      path: '/settings',
      component: ApiKeySettings,
      isVisible: false,
    },
    {
      id: 'nodePalette',
      path: '/palette',
      component: NodePalette,
      isVisible: false,
    },
  ]);

  const { nodes, edges } = useGraphStore();

  useEffect(() => {
    // Subscribe to visibility events
    const handleVisibilityChange = (
      event: BusEvent<{
        componentId: string;
        isVisible: boolean;
      }>
    ) => {
      if (event.type === 'COMPONENT_VISIBILITY') {
        setRoutes(prevRoutes =>
          prevRoutes.map(route =>
            route.id === event.payload.componentId
              ? { ...route, isVisible: event.payload.isVisible }
              : route
          )
        );
      }
    };

    const unsubscribe = eventBus.subscribe(
      ['COMPONENT_VISIBILITY'],
      handleVisibilityChange
    );

    return () => {
      // Use the returned unsubscribe function
      unsubscribe();
    };
  }, []);

  // Pass relevant state to visible components
  const getComponentProps = (route: ComponentRoute) => {
    switch (route.id) {
      case 'analytics':
        return { nodes, edges };
      case 'apiSettings':
        return {};
      case 'nodePalette':
        return {
          isOpen: route.isVisible,
          onClose: () => showComponent(route.id, false),
        };
      default:
        return route.props ?? {};
    }
  };

  return (
    <>
      {routes.map(
        route =>
          route.isVisible && (
            <route.component key={route.id} {...getComponentProps(route)} />
          )
      )}
    </>
  );
};

export const showComponent = (
  componentId: string,
  isVisible: boolean = true
) => {
  eventBus.publish({
    id: `visibility-${Date.now()}`,
    type: 'COMPONENT_VISIBILITY',
    timestamp: Date.now(),
    source: 'component-router',
    target: 'app',
    payload: {
      componentId,
      isVisible,
    },
  });
};
