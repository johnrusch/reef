import React from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-800">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;