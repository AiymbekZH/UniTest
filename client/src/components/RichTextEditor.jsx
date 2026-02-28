import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link2, Undo, Redo, Code, Palette, Highlighter } from 'lucide-react';

const COLORS = [
  '#000000', '#e53e3e', '#dd6b20', '#d69e2e', '#38a169',
  '#3182ce', '#805ad5', '#d53f8c', '#718096',
];

const HIGHLIGHTS = [
  { color: '#fef08a', label: 'Yellow' },
  { color: '#bbf7d0', label: 'Green' },
  { color: '#bfdbfe', label: 'Blue' },
  { color: '#fecaca', label: 'Red' },
  { color: '#e9d5ff', label: 'Purple' },
  { color: '#fed7aa', label: 'Orange' },
];

const MenuBar = ({ editor }) => {
  const [showColors, setShowColors] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);

  if (!editor) return null;

  const btn = (active, onClick, Icon, title) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600'
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
      }`}
    >
      <Icon size={15} />
    </button>
  );

  const addLink = () => {
    const url = window.prompt('URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-slate-600 flex-wrap relative">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), Bold, 'Bold')}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), Italic, 'Italic')}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), UnderlineIcon, 'Underline')}
      <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), List, 'Bullet list')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, 'Ordered list')}
      <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" />
      {btn(editor.isActive('link'), addLink, Link2, 'Link')}
      {btn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), Code, 'Code')}
      <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" />
      {/* Text color */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowColors(!showColors); setShowHighlights(false); }}
          title="Text color"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('textStyle') ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          <Palette size={15} />
        </button>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 flex gap-1 flex-wrap w-[140px]">
            {COLORS.map(c => (
              <button key={c} type="button"
                onClick={() => { editor.chain().focus().setColor(c).run(); setShowColors(false); }}
                className="w-6 h-6 rounded-md border border-gray-200 dark:border-slate-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <button type="button"
              onClick={() => { editor.chain().focus().unsetColor().run(); setShowColors(false); }}
              className="w-full text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
            >Reset</button>
          </div>
        )}
      </div>
      {/* Highlight */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShowHighlights(!showHighlights); setShowColors(false); }}
          title="Highlight"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('highlight') ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
          }`}
        >
          <Highlighter size={15} />
        </button>
        {showHighlights && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 flex gap-1 flex-wrap w-[140px]">
            {HIGHLIGHTS.map(h => (
              <button key={h.color} type="button"
                onClick={() => { editor.chain().focus().toggleHighlight({ color: h.color }).run(); setShowHighlights(false); }}
                className="w-6 h-6 rounded-md border border-gray-200 dark:border-slate-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: h.color }}
                title={h.label}
              />
            ))}
            <button type="button"
              onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlights(false); }}
              className="w-full text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
            >Reset</button>
          </div>
        )}
      </div>
      <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" />
      {btn(false, () => editor.chain().focus().undo().run(), Undo, 'Undo')}
      {btn(false, () => editor.chain().focus().redo().run(), Redo, 'Redo')}
    </div>
  );
};

export default function RichTextEditor({ content, onChange, placeholder = '', className = '' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-500 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Return empty string if editor is empty (only has <p></p>)
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none px-3 py-2 min-h-[80px] focus:outline-none text-sm',
      },
    },
  });

  return (
    <div className={`border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-300 dark:focus-within:border-primary-600 transition-all ${className}`}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
