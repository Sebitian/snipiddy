'use client';

import React from 'react';
import MenuAnalyzer from '@/components/menu-analyzer';

export default function AnalyzePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Analyze Restaurant Menus</h1>
      <p className="text-gray-600 mb-6">
        Upload a menu image or paste menu text to detect allergens and dietary information.
      </p>
      
      <MenuAnalyzer />
    </div>
  );
}