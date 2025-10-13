const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const officeParser = require('officeparser');

let mainWindow;
// Better dev mode detection
const isDev = !app.isPackaged;

// Flow automation global stop flag
let stopFlowAutomation = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        },
        icon: path.join(__dirname, '../public/icon.png'),
        backgroundColor: '#1a1a2e',
        show: false
    });

    // Load app
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// ============================================
// IPC HANDLERS - File Reading
// ============================================

ipcMain.handle('read-file-content', async (event, filePath) => {
    try {
        const ext = path.extname(filePath).toLowerCase();
        let content = '';

        if (ext === '.txt') {
            // Read plain text
            content = fs.readFileSync(filePath, 'utf-8');
        } else if (ext === '.pdf') {
            // For PDF - use pdfjs-dist
            const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

            const dataBuffer = fs.readFileSync(filePath);
            const typedArray = new Uint8Array(dataBuffer);

            const loadingTask = pdfjsLib.getDocument({ data: typedArray });
            const pdfDocument = await loadingTask.promise;

            let fullText = '';
            for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            content = fullText;
        } else if (ext === '.docx') {
            // For DOCX
            const result = await mammoth.extractRawText({ path: filePath });
            content = result.value;
        } else if (ext === '.pptx') {
            // For PPTX
            content = await officeParser.parseOfficeAsync(filePath);
        } else if (ext === '.doc') {
            // For old DOC format
            return { success: false, error: 'File .doc không được hỗ trợ. Vui lòng chuyển sang .docx' };
        } else {
            return { success: false, error: 'Định dạng file không được hỗ trợ' };
        }

        // Limit content length (max 50000 characters)
        if (content.length > 50000) {
            content = content.substring(0, 50000) + '\n\n[Nội dung bị cắt ngắn...]';
        }

        return { success: true, content: content.trim() };
    } catch (error) {
        console.error('Error reading file:', error);
        return { success: false, error: error.message };
    }
});

// Generate content summary for preview
ipcMain.handle('generate-content-summary', async (event, { apiKey, content, source }) => {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        // Use more content for detailed analysis
        let analysisContent = content;
        if (content.length > 30000) {
            analysisContent = content.substring(0, 30000) + '\n\n[Nội dung tiếp theo...]';
        }

        const prompt = `Bạn là chuyên gia phân tích nội dung giáo dục toán học, chuyên tạo storyboard video.

Hãy PHÂN TÍCH CHI TIẾT nội dung sau đây để giúp người dùng có cái nhìn toàn diện trước khi tạo storyboard:

${analysisContent}

📋 YÊU CẦU PHÂN TÍCH:

**1. Tổng quan nội dung (2-3 câu)**
   - Chủ đề chính và mục tiêu học tập
   - Đối tượng học sinh (cấp độ, lớp)

**2. Cấu trúc kiến thức**
   - Các phần chính và logic liên kết
   - Thứ tự trình bày (từ cơ bản → nâng cao)
   - Điểm nhấn quan trọng

**3. Khái niệm & Công thức**
   - Liệt kê các khái niệm toán học chính
   - Công thức quan trọng (nếu có)
   - Định lý, tính chất cần nhấn mạnh

**4. Ví dụ & Bài tập**
   - Các ví dụ minh họa
   - Dạng bài tập thực hành
   - Ứng dụng thực tế (nếu có)

**5. Đề xuất cho Storyboard**
   - Góc độ kể chuyện phù hợp
   - Visual suggestions (hình ảnh, animation nào)
   - Điểm cần diễn giải rõ ràng
   - Phần nào cần ví dụ trực quan

**6. Lưu ý đặc biệt**
   - Điểm khó, dễ nhầm lẫn
   - Phần cần nhấn mạnh
   - Kết nối với kiến thức trước/sau

Format: Markdown với emoji, rõ ràng, dễ đọc. Phân tích đầy đủ, chi tiết.`;

        const analysisResult = await model.generateContent(prompt);
        const analysisResponse = await analysisResult.response;
        const analysisText = analysisResponse.text();

        return {
            success: true,
            summary: analysisText.trim(),
            source
        };
    } catch (error) {
        console.error('Error generating content summary:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ============================================
// IPC HANDLERS - Story Generation
// ============================================

ipcMain.handle('generate-story-from-idea', async (event, { apiKey, idea, style, customInstructions, addBridgeScenes, hideFormulas, ensureContinuity }) => {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        // Build system instruction based on options
        let systemInstruction = `You are an expert educational video storyboard writer, specializing in creating detailed scene-by-scene scripts for mathematics education videos. Your expertise includes cinematography, visual storytelling, and educational content design.`;

        if (addBridgeScenes) {
            systemInstruction += ` You create storyboards with MAIN SCENES and BRIDGE SCENES for smooth transitions between locations/actions. Bridge scenes are short (3s) connecting scenes.`;
        }

        if (hideFormulas) {
            systemInstruction += ` CRITICAL: GEOMETRY-ONLY mode - NO text, NO formulas, NO numbers, NO Vietnamese text on-screen. All content delivered through dialogue and actions only.`;
        }

        if (ensureContinuity) {
            systemInstruction += ` Maintain strict CONTINUITY: consistent lighting (warm/natural), camera direction (left→right), character positions, and emotional flow across all scenes.`;
        }

        systemInstruction += ` Always write in Vietnamese, design for Vietnamese middle/high school students with red scarves.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            systemInstruction: systemInstruction
        });

        let stylePrompt = '';
        if (style && style !== '✨ Tùy chỉnh') {
            stylePrompt = `\nPhong cách hình ảnh: ${style}`;
        }

        // Build detailed prompt based on standard format
        const sceneStructure = addBridgeScenes ? '9 cảnh (6 cảnh chính + 3 cảnh bridge chuyển cảnh)' : '6 cảnh chính';
        const totalDuration = addBridgeScenes ? '~65s' : '~60s';

        const prompt = `Hãy tạo storyboard video giáo dục toán học CHUẨN CHUYÊN NGHIỆP cho chủ đề sau:

Chủ đề: ${idea}${stylePrompt}
${customInstructions ? `\nYêu cầu bổ sung: ${customInstructions}` : ''}

📋 CHUẨN STORYBOARD XUẤT:

**Format Header:**
🎬 CHUẨN STORYBOARD – "[Tiêu đề hấp dẫn]"

👥 Nhân vật:
[Tên]: [Học sinh nam/nữ THCS, đeo khăn quàng đỏ, áo đồng phục, tính cách...]
[Tên]: [Mô tả tương tự...]

🎨 Bối cảnh tổng thể:
[Địa điểm chính], có [đạo cụ, cây cối, đồ vật], ánh sáng [tự nhiên/studio/...].
Âm thanh: [tiếng gì].
Phong cách: ${hideFormulas ? 'Live-action học đường, geometry-only (không công thức, không chữ)' : 'Live-action học đường'}.
Tổng thời lượng: ${totalDuration} (${sceneStructure}).
Tông màu: sáng ấm, ánh sáng thống nhất, continuity xuyên suốt.
${hideFormulas ? 'Không có text, công thức, hoặc số liệu hiển thị trên màn hình — toàn bộ nội dung được thể hiện qua thoại và hành động.' : ''}

**Format từng cảnh:**

${addBridgeScenes ? `🎞 CẢNH 1 – [Tên cảnh] (0–10s)

Goal: [Mục đích giáo dục]
Bối cảnh: [Chi tiết môi trường]

Beat plan:
- 0–3s → [Hành động cụ thể]
- 3–7s → [Hành động tiếp theo]
- 7–10s → Giữ khung freeze – [Mô tả freeze frame]

Camera: [Mid-shot/Close-up/Wide shot, pan/tilt direction]
Thoại:
[Tên]: "[Lời thoại tiếng Việt]"
[Tên]: "[Lời thoại tiếp]"
Cảm xúc: [Tò mò/vui vẻ/tập trung...]
Transition: [Pan/Cut/Fade sang cảnh tiếp]

� CẢNH 1.5 – [Tên Bridge Scene] (10–13s) (Bridge Scene)

Goal: [Tạo chuyển cảnh tự nhiên từ X sang Y]
Bối cảnh: [Không gian liền kề, cùng ánh sáng]
Hành động:
[Mô tả di chuyển ngắn gọn]
Camera: [Wide shot từ sau lưng/pan direction]
Âm thanh: [Tiếng bước chân, gió...]
Transition: [Cut sang cảnh tiếp theo]

🎞 CẢNH 2 – [Tên cảnh] (13–23s)
[Tiếp tục format tương tự...]` : `🎞 CẢNH 1 – [Tên cảnh] (0–10s)

Goal: [Mục đích]
Scene description: [Mô tả hình ảnh]
Beat plan:
- 0–3s → [Hành động]
- 3–7s → [Hành động]  
- 7–10s → Giữ 3s – [Freeze instruction]
Camera: [Góc quay]
Action: [Nhân vật làm gì]
Lighting: [Chất lượng ánh sáng]
Thoại:
[Tên]: "[Lời nói]"
Hold instruction: [Giữ khung hình gì]
Transition: [Chuyển cảnh như thế nào]`}

✅ TỔNG KẾT CHUẨN XUẤT (tạo bảng tóm tắt cuối storyboard):

| Thành phần | Chuẩn tối thiểu | Ghi chú |
|------------|----------------|---------|
| Số cảnh | ${sceneStructure} | ${addBridgeScenes ? 'Giữ continuity mượt giữa các vị trí' : 'Giữ nhịp độ đều'} |
| Âm thanh | [Mô tả âm thanh phù hợp] | Không nhạc nền trong cảnh học |
| Font chữ | ${hideFormulas ? '❌ Không xuất hiện' : 'Nếu có, dùng không dấu'} | ${hideFormulas ? 'Toàn bộ qua thoại' : 'Font sans-serif rõ ràng'} |
| Công thức toán học | ${hideFormulas ? '❌ Không xuất hiện' : 'Có thể xuất hiện'} | ${hideFormulas ? 'Được diễn đạt qua thoại' : 'Hiển thị rõ ràng'} |
| Lighting & color | ${ensureContinuity ? 'Đồng nhất sáng ấm' : 'Linh hoạt theo cảnh'} | ${ensureContinuity ? 'Không thay đổi LUT giữa cảnh' : 'Phù hợp từng cảnh'} |
| Transition logic | ${ensureContinuity ? 'Giữ hướng di chuyển trái → phải' : 'Tự nhiên'} | ${ensureContinuity ? 'Nhân vật không "teleport"' : 'Mượt mà'} |
| Kết nối cảm xúc | Tò mò → hợp tác → hiểu bài → vui vẻ | Thống nhất biểu cảm xuyên suốt |

Hãy tạo storyboard theo ĐÚNG format trên!`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return { success: true, story: text };
    } catch (error) {
        console.error('Error generating story:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('generate-story-from-url', async (event, { apiKey, url, sourceType, fileName, urlIdea, style, customInstructions, addBridgeScenes, hideFormulas, ensureContinuity }) => {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');

        let content = '';

        // Check if it's file content or URL
        if (sourceType === 'file') {
            // url parameter contains the file content directly
            content = url;
        } else {
            // Fetch content from URL
            const https = require('https');
            content = await new Promise((resolve, reject) => {
                https.get(url, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => resolve(data));
                }).on('error', reject);
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Build system instruction based on options
        let systemInstruction = `You are an expert storyboard writer who transforms mathematical articles into detailed video scene scripts with camera angles, lighting, and character actions.`;

        if (addBridgeScenes) {
            systemInstruction += ` You create storyboards with MAIN SCENES and BRIDGE SCENES for smooth transitions.`;
        }

        if (hideFormulas) {
            systemInstruction += ` GEOMETRY-ONLY mode - NO text, NO formulas on-screen. All content through dialogue.`;
        }

        if (ensureContinuity) {
            systemInstruction += ` Maintain strict CONTINUITY: lighting, camera direction, character positions.`;
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            systemInstruction: systemInstruction
        });

        let stylePrompt = '';
        if (style) {
            stylePrompt = `\nPhong cách hình ảnh: ${style}`;
        }

        const sceneStructure = addBridgeScenes ? '9 cảnh (6 chính + 3 bridge)' : '6 cảnh chính';
        const totalDuration = addBridgeScenes ? '~65s' : '~60s';
        const sourceLabel = sourceType === 'file' ? `file ${fileName}` : 'bài viết';

        // Build content section with optional urlIdea
        let contentSection = `Nội dung ${sourceLabel}:
${content.substring(0, 10000)}`;

        if (urlIdea && urlIdea.trim()) {
            contentSection += `\n\n📝 Ý tưởng bổ sung từ người dùng:
${urlIdea.trim()}

→ Hãy kết hợp nội dung gốc với ý tưởng bổ sung để tạo storyboard phù hợp hơn với mục đích sử dụng.`;
        }

        const prompt = `Dựa trên nội dung ${sourceLabel} toán học sau đây, hãy tạo storyboard video giáo dục CHUẨN CHUYÊN NGHIỆP:

${contentSection}

${stylePrompt}
${customInstructions ? `\nYêu cầu bổ sung: ${customInstructions}` : ''}

📋 CHUẨN STORYBOARD XUẤT:

**Yêu cầu:**
1. Phân tích nội dung chính của bài viết
2. Tạo ${sceneStructure} (mỗi cảnh chính 10s, cảnh bridge 3s, tổng ${totalDuration})
3. 3 giây cuối mỗi cảnh chính: freeze frame để chèn text overlay
4. ${hideFormulas ? 'GEOMETRY-ONLY: Không text/công thức trên màn hình, toàn bộ qua thoại' : 'Có thể có text/công thức nếu cần'}
5. Mô tả: nhân vật (đeo khăn quàng đỏ), bối cảnh, camera, ánh sáng, hành động
6. Beat plan chi tiết cho mỗi cảnh
7. ${ensureContinuity ? 'Đảm bảo continuity: ánh sáng đồng nhất, hướng camera nhất quán, không teleport nhân vật' : 'Chuyển cảnh tự nhiên'}
8. Phù hợp học sinh THCS/THPT Việt Nam

**Format Header:**
🎬 CHUẨN STORYBOARD – "[Tiêu đề]"
👥 Nhân vật: [Mô tả chi tiết 2-3 nhân vật]
🎨 Bối cảnh tổng thể: [Địa điểm, đạo cụ, ánh sáng, âm thanh, phong cách]
⏱️ Tổng thời lượng: ${totalDuration}

**Format từng cảnh:**
${addBridgeScenes ? 'Bao gồm cả CẢNH CHÍNH và CẢNH BRIDGE với đầy đủ Goal, Beat plan, Camera, Thoại, Transition' : 'Các cảnh chính với Beat plan, Camera, Action, Thoại, Transition'}

✅ TỔNG KẾT CHUẨN XUẤT (bảng tóm tắt cuối):
Bao gồm số cảnh, âm thanh, font chữ, công thức, lighting, transition, cảm xúc

Hãy tạo storyboard theo ĐÚNG format CHUẨN trên!`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return { success: true, story: text };
    } catch (error) {
        console.error('Error generating story from URL:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('generate-metadata', async (event, { apiKey, story }) => {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp"
        });

        const prompt = `Dựa trên storyboard video giáo dục toán học sau đây, hãy tạo metadata cho video:

Storyboard:
${story}

Hãy tạo JSON với format sau:
{
  "title": "Tiêu đề video (ngắn gọn, hấp dẫn, phù hợp YouTube, 50-70 ký tự)",
  "description": "Mô tả chi tiết (150-200 từ, bao gồm: chủ đề toán học, cảnh quay chính, đối tượng xem, mục đích giáo dục)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"] (5-10 tags: toán học, storyboard, giáo dục, THCS, THPT, video)
}

Chỉ trả về JSON, không thêm text nào khác.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const metadata = JSON.parse(jsonMatch[0]);
            return { success: true, metadata };
        }

        return { success: false, error: 'Invalid JSON response' };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return { success: false, error: error.message };
    }
});// File dialog handlers
ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

// File system operations
ipcMain.handle('save-file', async (event, { filePath, content }) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Select download directory for Flow automation
ipcMain.handle('select-download-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// Import prompts from text file
ipcMain.handle('import-prompts-from-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        try {
            const content = fs.readFileSync(result.filePaths[0], 'utf-8');
            return content;
        } catch (error) {
            console.error('Error reading prompts file:', error);
            return null;
        }
    }
    return null;
});

// ============================================
// FLOW AUTOMATION - Batch Video Generation
// ============================================

// Cookie parser
function parseCookieForPuppeteer(cookieString) {
    const cookies = [];
    const pairs = cookieString.split('; ');

    for (const pair of pairs) {
        const [name, ...valueParts] = pair.split('=');
        const value = valueParts.join('=');

        if (!name || !value) continue;

        cookies.push({
            name: name.trim(),
            value: value.trim(),
            domain: '.labs.google',
            path: '/',
            httpOnly: name.includes('Secure') || name.includes('session'),
            secure: name.includes('Secure')
        });
    }

    return cookies;
}

// Download video helper
async function downloadVideoFromUrl(videoUrl, promptText, savePath, index) {
    try {
        const https = require('https');
        const sanitizedText = promptText
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 50);

        const filename = `video_${index + 1}_${sanitizedText}.mp4`;
        const fullPath = path.join(savePath, filename);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(fullPath);
            https.get(videoUrl, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve({ success: true, path: fullPath });
                });
            }).on('error', (err) => {
                fs.unlink(fullPath, () => { });
                reject({ success: false, error: err.message });
            });
        });
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==========================================
// PROMPT GENERATOR - Generate Video Prompts (JSON Format)
// ==========================================
ipcMain.handle('generate-video-prompts', async (event, { config, apiKey }) => {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: config.model === 'fast' ? 'gemini-2.0-flash-exp' : 'gemini-1.5-pro'
        });

        // Calculate number of prompts based on duration
        const sceneDuration = config.promptType === 'detailed' ? 8 : config.promptType === 'medium' ? 5 : 3;
        const totalSeconds = parseInt(config.duration) * 60;
        const numPrompts = Math.ceil(totalSeconds / sceneDuration);

        // ✨ NEW: Build system prompt using STORYBOARD format for consistency
        const systemPrompt = `You are an expert storyboard creator for AI video generation.

**Task:** Create ${numPrompts} scenes for video generation.

**Genre/Style:** ${config.style}
**Story Type:** ${config.storyType}
**Aspect Ratio:** ${config.aspectRatio || '16:9'}
**Scene Duration:** ${sceneDuration} seconds each
**Language:** ${config.language === 'vietnamese' ? 'Vietnamese' : config.language === 'english' ? 'English' : config.language}

${config.characterBible ? `**CHARACTER BIBLE (use character names ONLY in prompts):**\n${config.characterBible}\n` : ''}

**Setup Options Applied:**
${config.setupOptions.englishLanguage ? '- English prompts\n' : ''}${config.setupOptions.syncCharacters ? '- Consistent characters throughout\n' : ''}${config.setupOptions.nameCharacters ? '- Use character names\n' : ''}${config.setupOptions.useKeywords ? '- Describe emotions and expressions\n' : ''}${config.setupOptions.describeShapes ? '- Include camera angles\n' : ''}${config.setupOptions.describeColors ? '- Describe lighting and colors\n' : ''}${config.setupOptions.linkScenes ? '- Link scenes smoothly\n' : ''}${config.setupOptions.createStoryArc ? '- Create cohesive story arc\n' : ''}
**CRITICAL RULES:**
1. Each scene is ${sceneDuration} seconds long
2. Prompt structure:
   - ${config.characterBible ? 'Character names ONLY (NOT full descriptions)' : 'Character descriptions'}
   - Setting/location
   - Actions and movements
   - Lighting and atmosphere
   - Camera angle (if setupOptions.describeShapes enabled)
   - ${config.style} style
   - ${config.aspectRatio || '16:9'} aspect ratio
3. Camera: Professional camera angle (e.g., "Close-up", "Wide shot", "Medium shot", "Pan left to right")
4. Action: Main action in scene (brief description)
5. Dialogue: If characters speak, write in ${config.language === 'vietnamese' ? 'VIETNAMESE' : 'ENGLISH'} (embedded in video, NO subtitles)
6. Text: ${config.promptType === 'detailed' ? 'Detailed descriptions' : config.promptType === 'medium' ? 'Medium length' : 'Concise descriptions'}
7. NO text overlays, NO subtitles, NO speech bubbles
8. Keep lighting, style, and aspect ratio consistent
9. ${config.setupOptions.linkScenes ? 'Connect scenes smoothly (end of one scene flows to start of next)' : 'Each scene can be independent'}

**Output format:**
Return a JSON array of scenes:
[
  {
    "scene_number": 1,
    "text": "Full ${config.language === 'vietnamese' ? 'Vietnamese' : 'English'} prompt with all details...",
    "prompt_en": "Full English prompt (same as text if English, or translation if Vietnamese)",
    "prompt_vi": "Full Vietnamese prompt (same as text if Vietnamese, or translation if English)",
    "camera": "Camera angle description",
    "action": "Main action description",
    "dialogue": "${config.language === 'vietnamese' ? 'Lời thoại (nếu có)' : 'Dialogue (if any)'}"
  }
]`;

        // Build user prompt
        let userPrompt = '';
        if (config.storyContent) {
            userPrompt = `Based on this story, create ${numPrompts} video scenes:\n\n${config.storyContent}`;
        } else {
            userPrompt = `Create ${numPrompts} video scenes for a ${config.storyType} video in ${config.style} style.`;
        }

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
        const response = await result.response;
        let text = response.text();

        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse the JSON response
        const scenes = JSON.parse(text);

        // Validate that we got an array
        if (!Array.isArray(scenes)) {
            throw new Error('AI did not return a valid array');
        }

        // ✨ NEW: Validate and normalize to unified format
        const validPrompts = scenes
            .filter(s => s && (s.text || s.prompt_en || s.prompt_vi))
            .map((s, index) => ({
                scene_number: index + 1,
                text: s.text || s.prompt_en || s.prompt_vi || '',
                prompt_en: s.prompt_en || s.text || '',
                prompt_vi: s.prompt_vi || s.text || '',
                camera: s.camera || 'Medium shot',
                action: s.action || 'Scene action',
                dialogue: s.dialogue || ''
            }));

        if (validPrompts.length === 0) {
            throw new Error('No valid prompts generated');
        }

        console.log(`✅ Generated ${validPrompts.length} unified prompts with full metadata`);

        return {
            success: true,
            prompts: validPrompts
        };

    } catch (error) {
        console.error('Prompt generation error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
});

// ========== NEW HANDLERS FOR V2 ==========

// Generate Character Bible
ipcMain.handle('generate-character-bible', async (event, { context, characters, idea, genre, apiKey }) => {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const systemPrompt = `You are an expert video prompt writer specializing in creating detailed character descriptions for AI video generation.

**Task:** Create a CHARACTER BIBLE - a single paragraph (NO line breaks) describing all characters in detail.

**Genre:** ${genre}

**Requirements:**
1. Write ONE SINGLE PARAGRAPH (no line breaks within the paragraph)
2. Include for each character:
   - Name (if provided or create appropriate names)
   - Age
   - Physical appearance (face, hair, eyes, skin)
   - Clothing and accessories
   - Posture and expression
   - Any distinctive features
3. Use consistent names throughout
4. Make descriptions visual and specific
5. Match the ${genre} style

**Context:** ${context || 'Not provided'}
**Characters hint:** ${characters || 'Extract from the idea'}

**Output format:**
Return a JSON object:
{
  "english": "Single paragraph in English...",
  "vietnamese": "Single paragraph in Vietnamese (natural translation)..."
}

Both paragraphs must be on ONE LINE each (no \\n inside the strings).`;

        const userPrompt = `Based on this video idea, create a Character Bible:\n\n${idea}`;

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
        const response = await result.response;
        let text = response.text();

        // Remove markdown
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse JSON
        const data = JSON.parse(text);

        // Validate
        if (!data.english || !data.vietnamese) {
            throw new Error('Invalid Character Bible format');
        }

        console.log('✅ Generated Character Bible');

        return {
            success: true,
            data: {
                english: data.english.trim(),
                vietnamese: data.vietnamese.trim()
            }
        };

    } catch (error) {
        console.error('Character Bible generation error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
});

// Generate Storyboard
ipcMain.handle('generate-storyboard', async (event, { context, idea, genre, aspectRatio, numScenes, characterBible, apiKey }) => {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const calculatedScenes = numScenes || Math.ceil(idea.length / 100); // Auto-calculate if not provided

        const systemPrompt = `You are an expert storyboard creator for AI video generation.

**Task:** Create a storyboard with ${calculatedScenes} scenes.

**Genre:** ${genre}
**Aspect Ratio:** ${aspectRatio}
**Context:** ${context || 'Not provided'}

**CHARACTER BIBLE (reference this for character descriptions):**
${characterBible}

**CRITICAL RULES:**
1. Each scene is 8 seconds long
2. Prompt English: Full description including:
   - Character names ONLY (NOT full descriptions, they're in Character Bible)
   - Setting/location
   - Actions and movements
   - Lighting and atmosphere
   - Camera angle
   - ${genre} style
   - ${aspectRatio} aspect ratio
3. Prompt Vietnamese: Natural translation with full meaning
4. Camera: Describe camera angle (e.g., "Close-up", "Wide shot", "Pan left to right")
5. Action: Describe main action briefly
6. Dialogue: If characters speak, write dialogue in VIETNAMESE (will be embedded in prompt, NO subtitles)
7. NO text, NO subtitles, NO speech bubbles mentioned in prompts
8. Keep lighting, style, and aspect ratio consistent across all scenes
9. Make scenes connect smoothly

**Output format:**
Return a JSON array of scenes:
[
  {
    "scene_number": 1,
    "prompt_en": "Full English prompt with character names, setting, action, lighting, camera, style, aspect ratio...",
    "prompt_vi": "Bản dịch tiếng Việt đầy đủ...",
    "camera": "Camera angle description",
    "action": "Main action description",
    "dialogue": "Lời thoại (nếu có) bằng tiếng Việt"
  }
]`;

        const userPrompt = `Create ${calculatedScenes} scenes for this video idea:\n\n${idea}`;

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
        const response = await result.response;
        let text = response.text();

        // Remove markdown
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse JSON
        const scenes = JSON.parse(text);

        // Validate
        if (!Array.isArray(scenes)) {
            throw new Error('AI did not return a valid scenes array');
        }

        // Validate each scene
        const validScenes = scenes
            .filter(s => s && s.prompt_en && s.prompt_vi && s.camera && s.action)
            .map((s, index) => ({
                scene_number: index + 1,
                prompt_en: s.prompt_en.trim(),
                prompt_vi: s.prompt_vi.trim(),
                camera: s.camera.trim(),
                action: s.action.trim(),
                dialogue: s.dialogue ? s.dialogue.trim() : ''
            }));

        if (validScenes.length === 0) {
            throw new Error('No valid scenes generated');
        }

        console.log(`✅ Generated ${validScenes.length} scenes`);

        return {
            success: true,
            data: validScenes
        };

    } catch (error) {
        console.error('Storyboard generation error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
});

// Regenerate Single Scene
ipcMain.handle('regenerate-scene', async (event, { context, idea, genre, aspectRatio, characterBible, sceneNumber, previousScene, apiKey }) => {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const systemPrompt = `You are an expert storyboard creator for AI video generation.

**Task:** Create scene #${sceneNumber} for this video.

**Genre:** ${genre}
**Aspect Ratio:** ${aspectRatio}
**Context:** ${context || 'Not provided'}

**CHARACTER BIBLE:**
${characterBible}

${previousScene ? `**PREVIOUS SCENE (for continuity):**
Prompt: ${previousScene.prompt_en}
Action: ${previousScene.action}` : ''}

**CRITICAL RULES:**
1. Scene is 8 seconds long
2. Prompt English: Character names ONLY + setting + action + lighting + camera + style + aspect ratio
3. Prompt Vietnamese: Natural translation
4. Camera: Angle description
5. Action: Main action
6. Dialogue: Vietnamese only (if needed)
7. NO text, NO subtitles, NO speech bubbles
8. Connect smoothly with previous scene
9. Match ${genre} style and ${aspectRatio} ratio

**Output format:**
Return a single JSON object:
{
  "scene_number": ${sceneNumber},
  "prompt_en": "...",
  "prompt_vi": "...",
  "camera": "...",
  "action": "...",
  "dialogue": "..."
}`;

        const userPrompt = `Create scene #${sceneNumber} for this video:\n\n${idea}`;

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
        const response = await result.response;
        let text = response.text();

        // Remove markdown
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Parse JSON
        const scene = JSON.parse(text);

        // Validate
        if (!scene.prompt_en || !scene.prompt_vi) {
            throw new Error('Invalid scene format');
        }

        console.log(`✅ Regenerated scene #${sceneNumber}`);

        return {
            success: true,
            data: {
                scene_number: sceneNumber,
                prompt_en: scene.prompt_en.trim(),
                prompt_vi: scene.prompt_vi.trim(),
                camera: scene.camera ? scene.camera.trim() : '',
                action: scene.action ? scene.action.trim() : '',
                dialogue: scene.dialogue ? scene.dialogue.trim() : ''
            }
        };

    } catch (error) {
        console.error('Scene regeneration error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
});

// Generate structured video prompts from storyboard (Tab 1)
ipcMain.handle('generate-structured-prompts', async (event, { storyboard, apiKey }) => {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        // Build system prompt with detailed template
        const systemPrompt = `You are an expert video prompt creator for educational videos.

**Task:** Generate structured video prompts following this EXACT format.

**INPUT:** You will receive a storyboard with scenes, characters, and story details.

**OUTPUT FORMAT:**

First, generate SETTING CHUNG (general settings) - generated ONCE:

🧱 SETTING CHUNG – Thông số kỹ thuật & phong cách

Style: Cinematic Pixar-like realism kết hợp học liệu 2D/3D. Giữ phong cách giáo dục Việt Nam, tông màu sáng ấm, chi tiết rõ nét nhưng không rối.

Location: [Extract from storyboard - Vietnamese school context]

Characters:
  [List all main characters with descriptions from storyboard]

Character consistency control:
  [For each main character, create consistency rules]
  [Character name]:
    reference_tag: "[CharacterName]_[role]"
    face_embedding: fixed
    outfit: "[detailed outfit description]"
    hairstyle: "[detailed hairstyle]"
    tone: "[skin tone description]"
    physical_traits: "[height, build, distinctive features]"

Environment control:
  lighting_source: "left-top soft daylight"
  temperature_kelvin: 5200
  shadow_direction: "consistent across scenes"
  color_palette: "warm neutral classroom tones"
  prop_persistence: true
  background_consistency: "maintain same classroom layout and decorations"

Audio continuity:
  ambient_loop: "classroom_soft_ambience"
  crossfade_duration: 0.8s
  maintain_volume_ratio: "speech 0.85 / ambience 0.15"
  microphone_type: "lapel simulation"
  background_sounds: "subtle paper rustling, pencil writing, distant classroom"

Camera style: Góc quay trung bình (mid-shot) cho thoại, top-view khi mô phỏng hình học. Giữ khung hình ổn định, chuyển động mượt, tránh lia máy nhanh.

Animation notes: Mọi hình khối hình học phải chính xác (đáy tròn, chiều cao vuông góc, mặt xung quanh đúng tỷ lệ). Không hiển thị chữ, số, công thức hay ký hiệu toán học trên video. Chỉ biểu diễn bằng hình ảnh và lời thoại.

Duration default: 10s mỗi cảnh
Aspect: 16:9
FPS: 24
Voice tone: Giọng học thuật tiếng Việt, chậm rãi, rõ ràng (~0.85x).

Focus priority:
  - Tính chính xác hình học
  - Cử chỉ tự nhiên của nhân vật
  - Tính mạch lạc giữa các cảnh

Render control: Không text, không ký hiệu, không label — chỉ hành động, vật thể, ánh sáng.

Timeline metadata:
  series_id: "[Generate unique ID from storyboard title]"
  total_scenes: [Number of scenes]
  continuity_mode: "strict"

---

Then, for EACH scene, generate:

🎞️ PROMPT – Scene [number]

Goal: [Scene purpose - what should be learned/shown]

Scene description: [Overall context - characters present, setting, objects visible, layout]

Beat plan:
  0–3s: [Opening action - what happens in first 3 seconds]
  3–7s: [Main action - core content of scene]
  7–10s: [Closing/transition action - how scene ends]

Camera: [Camera angles and movements for this scene]

Animation / Action: [Detailed description of character movements, object interactions, gestures]

Emotion: [Atmosphere and emotional tone of the scene]

Overlay (nếu có): [Optional visual indicators like arrows, light effects, highlights - leave blank if none]

Geometry mode: [2D or 3D as appropriate for content]

Lighting: [Maintain consistency with SETTING CHUNG - left-top soft daylight, 5200K, consistent shadows]

Render control: Không text, không công thức. Chỉ hiển thị vật thể, hành động và cử chỉ nhân vật.

Character consistency check: [Verify all characters match their reference_tag descriptions from SETTING CHUNG]

Transition to next: [How this scene transitions to the next - smooth cut, fade, match action, etc]

Continuity:
  timeline_id: "[same series_id from SETTING CHUNG]"
  scene_number: [current scene number]
  previous_scene: "Scene_[number-1]" (or "None" if first scene)
  next_scene: "Scene_[number+1]" (or "End" if last scene)
  transition_type: "[soft cut / match action / fade / dissolve]"
  maintain_from_previous: "[List key elements to keep: character positions, lighting angle, prop placement]"

TTS Script:
  [Character name]: "[Dialogue line in Vietnamese]"
  [Character name]: "[Dialogue line in Vietnamese]"

---

**CRITICAL RULES:**
1. Output as formatted TEXT with emoji headers, NOT JSON
2. Generate SETTING CHUNG only ONCE at the beginning
3. Generate one 🎞️ PROMPT block for EACH scene (6-10 scenes typical)
4. Keep Vietnamese language natural and educational
5. All dialogue in TTS Script must be in Vietnamese
6. No English in output except section labels
7. MAINTAIN STRICT CHARACTER CONSISTENCY: Each character MUST keep exact same face, hairstyle, outfit across ALL scenes using their reference_tag
8. MAINTAIN ENVIRONMENT CONSISTENCY: Same lighting (left-top, 5200K), same classroom layout, same props across ALL scenes
9. MAINTAIN AUDIO CONSISTENCY: Same ambient sounds, same volume ratios throughout
10. Each scene exactly 10 seconds
11. NO text, numbers, or formulas visible in video - only dialogue
12. Focus on geometric accuracy for math/science content
13. Use Continuity metadata in EVERY scene to link timeline
14. When describing characters in scenes, reference their consistency control tags from SETTING CHUNG
15. Transition types must be smooth and maintain visual continuity`;

        const userPrompt = `Generate structured video prompts for this storyboard:\n\n${JSON.stringify(storyboard, null, 2)}`;

        console.log('🎬 Generating structured prompts...');

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Structured prompts generated');

        return {
            success: true,
            data: text.trim()
        };

    } catch (error) {
        console.error('Structured prompt generation error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
});

// Generate character image using Gemini (Tab 2)
ipcMain.handle('generate-character-image', async (event, { prompt, apiKey, referenceImage }) => {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        // Use image generation model from Veo Auto
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-preview-image-generation'
        });

        console.log('🎨 Generating character image...');
        if (referenceImage) {
            console.log('📸 Using reference image for style guidance');
        }

        // Build content parts
        const parts = [];

        // Add reference image first if provided
        if (referenceImage) {
            // Extract base64 data from data URL
            const base64Data = referenceImage.split(',')[1];
            const mimeType = referenceImage.split(';')[0].split(':')[1];

            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }

        // Add text prompt
        parts.push({ text: prompt });

        const result = await model.generateContent({
            contents: [{ parts: parts }],
            generationConfig: {
                responseModalities: ['IMAGE', 'TEXT']
            }
        });

        const response = await result.response;

        // Extract image data from response (Veo Auto method)
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData && imagePart.inlineData.mimeType) {
            const imageData = imagePart.inlineData.data || '';
            const mimeType = imagePart.inlineData.mimeType;
            const dataUrl = `data:${mimeType};base64,${imageData}`;

            console.log('✅ Character image generated');

            return {
                success: true,
                data: dataUrl
            };
        } else {
            throw new Error('Không tìm thấy dữ liệu hình ảnh trong phản hồi từ API.');
        }

    } catch (error) {
        console.error('Character image generation error:', error);
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
});
