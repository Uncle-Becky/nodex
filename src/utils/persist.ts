import type { Edge, Node } from '@xyflow/react';
import { saveAs } from 'file-saver';

export function saveFlow(nodes: Node[], edges: Edge[]) {
  const flow = { nodes, edges };
  const blob = new Blob([JSON.stringify(flow, null, 2)], {
    type: 'application/json',
  });
  saveAs(blob, 'flow.json');
}

export function loadFlow(): Promise<{ nodes: Node[]; edges: Edge[] }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = event => {
        try {
          const flow = JSON.parse(event.target?.result as string);
          resolve(flow);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}
