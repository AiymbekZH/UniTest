import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link2, Undo, Redo, Code } from 'lucide-react';

const MenuBar = ({ editor }) => {
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
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-slate-600 flex-wrap">
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
