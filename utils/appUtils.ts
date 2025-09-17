
import type { NotepadAction } from '../types';

const TAG_REGEX = /<np-([\w-]+)([^>]*)>([\s\S]*?)<\/np-\1>|<np-([\w-]+)([^>]*?)\/>/gi;
const ATTR_REGEX = /(\w+)="([^"]*)"/g;

export const parseAIResponse = (responseText: string): { spokenResponse: string; notepadActions: NotepadAction[] } => {
    const actions: NotepadAction[] = [];
    const spokenResponse = responseText.replace(TAG_REGEX, '').trim();

    let match;
    while ((match = TAG_REGEX.exec(responseText)) !== null) {
        const tagName = (match[1] || match[4]).toLowerCase();
        const attrsStr = match[2] || match[5] || '';
        const content = match[3] || '';
        
        const attrs: { [key: string]: string } = {};
        let attrMatch;
        while ((attrMatch = ATTR_REGEX.exec(attrsStr)) !== null) {
            attrs[attrMatch[1]] = attrMatch[2];
        }

        try {
            switch (tagName) {
                case 'replace-all':
                    actions.push({ action: 'replace_all', content });
                    break;
                case 'append':
                    actions.push({ action: 'append', content });
                    break;
                case 'prepend':
                    actions.push({ action: 'prepend', content });
                    break;
                case 'insert':
                    if (attrs.line) {
                        actions.push({ action: 'insert', line: parseInt(attrs.line, 10), content });
                    }
                    break;
                case 'replace':
                    if (attrs.line) {
                        actions.push({ action: 'replace', line: parseInt(attrs.line, 10), content });
                    }
                    break;
                case 'delete':
                    if (attrs.line) {
                        actions.push({ action: 'delete', line: parseInt(attrs.line, 10) });
                    }
                    break;
                case 'search-replace':
                    if (attrs.find && attrs.with) {
                        actions.push({ action: 'search_replace', find: attrs.find, with: attrs.with, all: attrs.all === 'true' });
                    }
                    break;
            }
        } catch (e) {
            console.error("Error parsing notepad tag:", match[0], e);
        }
    }

    return { spokenResponse, notepadActions: actions };
};


export const applyNotepadModifications = (currentContent: string, actions: NotepadAction[]): string => {
    let newContent = currentContent;
    
    for (const action of actions) {
        let lines = newContent.split('\n');
        
        switch (action.action) {
            case 'replace_all':
                newContent = action.content;
                break;
            case 'append':
                newContent = newContent + (newContent.length > 0 ? '\n' : '') + action.content;
                break;
            case 'prepend':
                newContent = action.content + (newContent.length > 0 ? '\n' : '') + newContent;
                break;
            case 'insert':
                const insertLine = Math.max(0, Math.min(lines.length, action.line));
                lines.splice(insertLine, 0, action.content);
                newContent = lines.join('\n');
                break;
            case 'replace':
                const replaceLine = action.line - 1;
                if (replaceLine >= 0 && replaceLine < lines.length) {
                    lines[replaceLine] = action.content;
                }
                newContent = lines.join('\n');
                break;
            case 'delete':
                const deleteLine = action.line - 1;
                if (deleteLine >= 0 && deleteLine < lines.length) {
                    lines.splice(deleteLine, 1);
                }
                newContent = lines.join('\n');
                break;
            case 'search_replace':
                if (action.all) {
                    // Using split and join to avoid regex complexities with user input
                    newContent = newContent.split(action.find).join(action.with);
                } else {
                    newContent = newContent.replace(action.find, action.with);
                }
                break;
        }
    }
    
    return newContent;
};
