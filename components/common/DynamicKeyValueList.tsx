
import React from 'react';
import FormField from './FormField';

interface DynamicKeyValueListProps {
    label: string;
    items: { key: string; value: string; id: string; }[];
    onItemChange: (id: string, key: 'key' | 'value', value: string) => void;
    onAddItem: () => void;
    onRemoveItem: (id: string) => void;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    addButtonText?: string;
    description?: string;
}

const DynamicKeyValueList: React.FC<DynamicKeyValueListProps> = ({
    label, items, onItemChange, onAddItem, onRemoveItem,
    keyPlaceholder = 'Key', valuePlaceholder = 'Value', addButtonText = `Add item`, description
}) => {
    return (
        <FormField label={label} description={description}>
            <div className="space-y-3">
                {items.map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                        <input
                            type="text"
                            placeholder={keyPlaceholder}
                            value={item.key}
                            onChange={(e) => onItemChange(item.id, 'key', e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
                        />
                        <input
                            type="text"
                            placeholder={valuePlaceholder}
                            value={item.value}
                            onChange={(e) => onItemChange(item.id, 'value', e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-gray-400 hover:text-red-400 p-2 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={onAddItem}
                    className="flex items-center text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {addButtonText}
                </button>
            </div>
        </FormField>
    );
};

export default DynamicKeyValueList;
