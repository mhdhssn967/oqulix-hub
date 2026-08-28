import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ totalItems, currentPage, setCurrentPage, itemsPerPage }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-white">
      <div className="text-[13px] text-zinc-500">
        Showing <span className="font-medium text-zinc-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-zinc-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="font-medium text-zinc-900">{totalItems}</span> results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-[13px] font-medium text-zinc-700">
          Page {currentPage} of {totalPages}
        </div>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
