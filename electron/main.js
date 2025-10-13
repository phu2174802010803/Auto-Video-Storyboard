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
        let systemInstruction = `You are an expert educational video storyboard writer, specializing in creating detailed scene-by-scene scripts for mathematics education videos. Your expertise includes cinematography, visual storytelling, and educational content design.

CRITICAL: Apply CONSISTENCY CONTROLS for AI video generation (Veo 3, Sora 2, Runway Gen-3, Pika 2.0):

1. CHARACTER CONSISTENCY:
   - Describe characters in PIXAR-LEVEL DETAIL (age, face shape, eyes color/size, nose, mouth, skin tone, hair style/color/texture, height, build, outfit details, personality traits)
   - Use reference tags: [CharacterName]_consistent
   - Example: "Nam, 12 tuổi, mặt tròn, mắt nâu to sáng, mũi nhỏ, nụ cười rạng rỡ, da sáng Việt Nam, tóc đen ngắn chải gọn, chiều cao trung bình 145cm, dáng người gầy khỏe mạnh, áo trắng tay ngắn, quần xanh navy, khăn đỏ, giày thể thao trắng, năng lượng cao, tò mò"
   - ALL characters MUST maintain EXACT SAME appearance across ALL scenes

2. ENVIRONMENT CONTROL:
   - Lighting: temperature_kelvin 5200 (neutral daylight), consistent shadow direction
   - Background: maintain same layout, props, furniture across scenes
   - Color palette: warm neutral tones
   - Props persistence: objects don't disappear/appear randomly

3. AUDIO CONTINUITY:
   - Ambient loop: consistent background sound throughout
   - Crossfade: 0.8s between scenes
   - Volume ratio: speech 0.85 / ambience 0.15
   - Microphone: lapel simulation for natural voice

4. TIMELINE METADATA:
   - Link scenes with timeline_id
   - Specify scene_number, previous_scene, next_scene
   - Transition type: soft cut/match action/fade/dissolve
   - Maintain elements: character positions, lighting angle, desk arrangement`;

        if (addBridgeScenes) {
            systemInstruction += ` You create storyboards with MAIN SCENES and BRIDGE SCENES for smooth transitions between locations/actions. Bridge scenes are short (3s) connecting scenes.`;
        }

        if (hideFormulas) {
            systemInstruction += ` 
⛔ CRITICAL - ABSOLUTE BAN ON TEXT/NUMBERS/FORMULAS IN VIDEO:
- NO mathematical expressions (e.g., "2/3", "1/2 + 1/3", "x + y = z")
- NO numbers written anywhere (e.g., "3", "15", "0.5")
- NO Vietnamese text on screen (e.g., labels, titles, captions)
- NO symbols (e.g., "=", "+", "÷", "×", "√")
- REASON: AI video generators (Veo, Sora, Runway) ALWAYS render text/math INCORRECTLY
- EXAMPLE BAD: "2/3 - (1/2 + 1/3)" written on board → AI renders wrong formula
- SOLUTION: Character speaks "hai phần ba trừ một nửa cộng một phần ba" while pointing at empty board
- ALL math content MUST be delivered through DIALOGUE and VISUAL ACTIONS only
- Use visual representations: show fraction bars, geometric shapes, counting with fingers/objects`;
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

👥 Nhân vật (MÔ TẢ CHI TIẾT PIXAR-LEVEL để AI tái tạo đúng):
[Tên]: [reference_tag: [Name]_consistent]
  • Tuổi: [12 tuổi]
  • Khuôn mặt: [tròn/vuông/oval], mắt [màu nâu/đen, to/nhỏ, biểu cảm gì], mũi [nhỏ/cao/tẹt], miệng [nụ cười rộng/nhỏ], da [sáng/ngăm đen], điểm đặc biệt [má lúm đồng tiền/vết chàm/...]
  • Tóc: [đen/nâu], [ngắn gọn/dài vai], [thẳng/xoăn], [chi tiết: chải ngôi giữa/buộc đuôi gà/...]
  • Thân hình: chiều cao [145cm/150cm/...], dáng [gầy/mập/khỏe], tư thế [tự tin/nhút nhát]
  • Trang phục: áo [trắng tay ngắn đồng phục], quần [xanh navy dài], khăn [đỏ cột cổ], giày [thể thao trắng]
  • Tính cách: [tò mò, năng lượng cao, hay cười, nhiệt tình/trầm tính, suy nghĩ sâu, ít nói]
  • Animation style: Pixar-inspired 3D semi-realistic
  • ⚠️ GIỮ NGUYÊN thiết kế này TRONG MỌI CẢNH

[Tên 2]: [Mô tả tương tự với cùng mức độ chi tiết...]

🎨 Bối cảnh tổng thể:
[Địa điểm chính: lớp học/sân trường/...], có [bàn ghế gỗ, bảng đen, cây xanh qua cửa sổ, ...].
Ánh sáng: [tự nhiên qua cửa sổ bên trái, 5200K neutral daylight, bóng đổ hướng nhất quán].
Âm thanh: [tiếng chim hót nhẹ, giấy xào xạc, bút viết, ambient loop: classroom_soft_ambience].
Màu sắc: [tông ấm trung tính, palette lớp học Việt Nam].
Phong cách: ${hideFormulas ? 'Pixar-inspired 3D semi-realistic, geometry-only (không công thức, không chữ)' : 'Pixar-inspired 3D semi-realistic'}.
Tổng thời lượng: ${totalDuration} (${sceneStructure}).
Timeline metadata: series_id "[TitleSlug]", continuity_mode "strict".
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
        let systemInstruction = `You are an expert storyboard writer who transforms mathematical articles into detailed video scene scripts with camera angles, lighting, and character actions.

CRITICAL: Apply CONSISTENCY CONTROLS for AI video generation (Veo 3, Sora 2, Runway Gen-3, Pika 2.0):

1. CHARACTER CONSISTENCY:
   - Describe characters in PIXAR-LEVEL DETAIL (age, face shape, eyes color/size, nose, mouth, skin tone, hair style/color/texture, height, build, outfit details, personality traits)
   - Use reference tags: [CharacterName]_consistent
   - Example: "Nam, 12 tuổi, mặt tròn, mắt nâu to sáng, mũi nhỏ, nụ cười rạng rỡ, da sáng Việt Nam, tóc đen ngắn chải gọn, chiều cao trung bình 145cm, dáng người gầy khỏe mạnh, áo trắng tay ngắn, quần xanh navy, khăn đỏ, giày thể thao trắng, năng lượng cao, tò mò"
   - ALL characters MUST maintain EXACT SAME appearance across ALL scenes

2. ENVIRONMENT CONTROL:
   - Lighting: temperature_kelvin 5200 (neutral daylight), consistent shadow direction
   - Background: maintain same layout, props, furniture across scenes
   - Color palette: warm neutral tones
   - Props persistence: objects don't disappear/appear randomly

3. AUDIO CONTINUITY:
   - Ambient loop: consistent background sound throughout
   - Crossfade: 0.8s between scenes
   - Volume ratio: speech 0.85 / ambience 0.15
   - Microphone: lapel simulation for natural voice

4. TIMELINE METADATA:
   - Link scenes with timeline_id
   - Specify scene_number, previous_scene, next_scene
   - Transition type: soft cut/match action/fade/dissolve
   - Maintain elements: character positions, lighting angle, desk arrangement`;

        if (addBridgeScenes) {
            systemInstruction += ` You create storyboards with MAIN SCENES and BRIDGE SCENES for smooth transitions.`;
        }

        if (hideFormulas) {
            systemInstruction += ` 
⛔ ABSOLUTE BAN - NO TEXT/NUMBERS/FORMULAS IN VIDEO:
- NO math expressions (e.g., "2/3 - (1/2 + 1/3)", "a² + b² = c²")
- NO numbers anywhere (e.g., "3", "0.5", "15")
- NO text labels (e.g., Vietnamese text, subtitles, captions)
- REASON: AI video generators render text/formulas INCORRECTLY
- SOLUTION: ALL content via DIALOGUE + VISUAL ACTIONS only
- EXAMPLE: Character says "hai phần ba trừ một nửa" while showing fraction bars visually`;
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
4. ${hideFormulas ? '⛔ CRITICAL - ABSOLUTE BAN: KHÔNG text/số/công thức trên màn hình. VÍ DỤ SAI: "2/3 - (1/2 + 1/3)" viết trên bảng → AI render sai. ĐÚNG: Nhân vật nói "hai phần ba trừ một nửa cộng một phần ba" và chỉ vào bảng trống/vật thể trực quan. Toàn bộ qua THOẠI + HÀNH ĐỘNG TRỰC QUAN.' : 'Có thể có text/công thức nếu cần'}
5. Mô tả: nhân vật (đeo khăn quàng đỏ), bối cảnh, camera, ánh sáng, hành động
6. Beat plan chi tiết cho mỗi cảnh
7. ${ensureContinuity ? 'Đảm bảo continuity: ánh sáng đồng nhất, hướng camera nhất quán, không teleport nhân vật' : 'Chuyển cảnh tự nhiên'}
8. Phù hợp học sinh THCS/THPT Việt Nam
9. ⚠️ LƯU Ý QUAN TRỌNG: AI video generators (Veo 3, Sora 2, Runway Gen-3) LUÔN render sai các công thức toán học và chữ số. Thay vào đó, sử dụng biểu diễn trực quan (thanh phân số, hình khối, đếm bằng ngón tay/vật thể) và lời thoại.

**Format Header:**
🎬 CHUẨN STORYBOARD – "[Tiêu đề]"

👥 Nhân vật (MÔ TẢ CHI TIẾT PIXAR-LEVEL):
[Tên]: [reference_tag: [Name]_consistent]
  • Tuổi: [12 tuổi]
  • Khuôn mặt: [tròn/vuông/oval], mắt [màu nâu/đen, to/nhỏ, biểu cảm gì], mũi [nhỏ/cao/tẹt], miệng [nụ cười rộng/nhỏ], da [sáng/ngăm đen], điểm đặc biệt [má lúm đồng tiền/vết chàm/...]
  • Tóc: [đen/nâu], [ngắn gọn/dài vai], [thẳng/xoăn], [chi tiết: chải ngôi giữa/buộc đuôi gà/...]
  • Thân hình: chiều cao [145cm/150cm/...], dáng [gầy/mập/khỏe], tư thế [tự tin/nhút nhát]
  • Trang phục: áo [trắng tay ngắn đồng phục], quần [xanh navy dài], khăn [đỏ cột cổ], giày [thể thao trắng]
  • Tính cách: [tò mò, năng lượng cao, hay cười, nhiệt tình/trầm tính, suy nghĩ sâu, ít nói]
  • Animation style: Pixar-inspired 3D semi-realistic
  • ⚠️ GIỮ NGUYÊN thiết kế này TRONG MỌI CẢNH

🎨 Bối cảnh tổng thể:
[Địa điểm chính], có [đạo cụ chi tiết], ánh sáng [5200K neutral daylight, bóng đổ nhất quán], âm thanh [ambient loop: classroom_soft_ambience], màu sắc [tông ấm trung tính].
Phong cách: Pixar-inspired 3D semi-realistic.
Timeline metadata: series_id "[TitleSlug]", continuity_mode "strict".

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
        const sceneDuration = config.promptType === 'detailed' ? 10 : config.promptType === 'medium' ? 8 : 5;
        const totalSeconds = parseInt(config.duration) * 60;
        const numPrompts = Math.ceil(totalSeconds / sceneDuration);

        // Build system prompt with FULL structured format (SETTING CHUNG + PROMPT per scene)
        const systemPrompt = `You are an expert video prompt creator for educational videos.

**Task:** Generate structured video prompts following this EXACT format.

**INPUT DETAILS:**
- Genre/Style: ${config.style}
- Story Type: ${config.storyType}
- Number of scenes: ${numPrompts}
- Scene duration: ${sceneDuration} seconds each
- Aspect Ratio: ${config.aspectRatio || '16:9'}
- Language: ${config.language === 'vietnamese' ? 'Vietnamese' : config.language === 'english' ? 'English' : config.language}
${config.characterBible ? `\n**CHARACTER BIBLE:**\n${config.characterBible}\n` : ''}

**OUTPUT FORMAT:**

First, generate SETTING CHUNG (general settings) - generated ONCE:

🧱 SETTING CHUNG – Thông số kỹ thuật & phong cách

Style: ${config.style}. Giữ phong cách giáo dục, tông màu sáng ấm, chi tiết rõ nét.

Location: [Generate appropriate location based on story type and style]

Characters:
  [List all main characters with brief descriptions]

Character consistency control:
  [For EACH main character, create DETAILED description in this format:]
  
  [Character name]:
    reference_tag: "[CharacterName]_[role]_consistent"
    age: "[exact age]"
    facial_features:
      face_shape: "[round/oval/square]"
      eyes: "[color], [size], [expression]"
      nose: "[small/medium/large], [shape]"
      mouth: "[description], [smile type]"
      skin_tone: "[description]"
      distinctive_marks: "[unique features]"
    hair:
      style: "[detailed hairstyle]"
      color: "[hair color]"
      texture: "[straight/wavy/curly]"
      details: "[bangs/neat/messy]"
    body:
      height: "[short/average/tall] for age"
      build: "[slim/athletic/average]"
      posture: "[confident/relaxed/curious]"
    outfit:
      top: "[shirt description]"
      bottom: "[pants/skirt description]"
      accessories: "[list accessories]"
      shoes: "[shoe type and color]"
    personality_expression:
      default_emotion: "[cheerful/gentle/curious]"
      energy_level: "[high/moderate/calm]"
      signature_gesture: "[specific gesture]"
    animation_style: "Pixar-inspired 3D semi-realistic, expressive"
    render_instruction: "Keep EXACT design in EVERY scene"

Environment control:
  lighting_source: "soft natural lighting"
  temperature_kelvin: 5200
  shadow_direction: "consistent across scenes"
  color_palette: "[appropriate for style]"
  prop_persistence: true

Audio continuity:
  ambient_loop: "[appropriate ambient sound]"
  crossfade_duration: 0.8s
  maintain_volume_ratio: "speech 0.85 / ambience 0.15"

Camera style: ${config.setupOptions.describeShapes ? 'Professional camera angles with variety' : 'Standard mid-shots'}

Duration default: ${sceneDuration}s per scene
Aspect: ${config.aspectRatio || '16:9'}
FPS: 24

Timeline metadata:
  series_id: "[Generate unique ID]"
  total_scenes: ${numPrompts}
  continuity_mode: "strict"

---

Then, for EACH scene (${numPrompts} scenes total), generate:

🎞️ PROMPT – Scene [number]

Goal: [Scene purpose]

Scene description: [Overall context with characters and setting]

Characters in scene: [List characters with reference to consistency control]

Beat plan:
  0–${Math.floor(sceneDuration/3)}s: [Opening action]
  ${Math.floor(sceneDuration/3)}–${Math.floor(sceneDuration*2/3)}s: [Main action]
  ${Math.floor(sceneDuration*2/3)}–${sceneDuration}s: [Closing/transition]

Camera: [Camera angle]

Animation / Action: [Detailed movements]

Emotion: [Atmosphere]

Lighting: [Maintain consistency - soft natural, 5200K]

Continuity:
  timeline_id: "[same series_id]"
  scene_number: [current number]
  previous_scene: "Scene_[number-1]" or "None"
  next_scene: "Scene_[number+1]" or "End"
  transition_type: "[soft cut/fade/dissolve]"
  maintain_from_previous: "[elements to keep]"

TTS Script:
  [Character]: "[Dialogue in ${config.language === 'vietnamese' ? 'Vietnamese' : 'English'}]"

---

**CRITICAL RULES:**
1. Output as formatted TEXT with emoji headers (🧱 🎞️), NOT JSON
2. Generate SETTING CHUNG only ONCE at the beginning
3. Generate exactly ${numPrompts} scenes (one 🎞️ PROMPT block per scene)
4. Each scene exactly ${sceneDuration} seconds
5. Character consistency control MUST have DETAILED descriptions
6. Keep same characters, lighting, and environment throughout ALL scenes
7. ${config.setupOptions.linkScenes ? 'Link scenes smoothly with continuity metadata' : 'Each scene can be independent'}
8. NO text overlays, NO subtitles visible in video
9. Dialogue in TTS Script: ${config.language === 'vietnamese' ? 'Vietnamese only' : 'English only'}
10. Maintain strict visual consistency across all scenes`;

        // Build user prompt
        let userPrompt = '';
        if (config.storyContent) {
            userPrompt = `Based on this story, create ${numPrompts} video scenes:\n\n${config.storyContent}`;
        } else {
            userPrompt = `Create ${numPrompts} video scenes for a ${config.storyType} video in ${config.style} style.`;
        }

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
        const response = await result.response;
        const text = response.text().trim();

        console.log(`✅ Generated structured prompts with SETTING CHUNG + ${numPrompts} scenes`);

        return {
            success: true,
            data: text  // Return raw formatted text, not JSON array
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
  [List all main characters with brief intro from storyboard]

Character consistency control:
  [For EACH main character, create DETAILED consistency description in this format:]
  
  [Character name]:
    reference_tag: "[CharacterName]_[role]_consistent"
    
    age: "[exact age, e.g., 12 years old]"
    
    facial_features:
      face_shape: "[round/oval/square], soft features"
      eyes: "[color] eyes, [size - large/medium], [expression - bright/gentle]"
      nose: "[small/medium], button nose"
      mouth: "[description], [smile type - cheerful/gentle/bright]"
      skin_tone: "[light/warm/natural] Vietnamese skin tone"
      distinctive_marks: "[any unique features like dimples, freckles]"
    
    hair:
      style: "[detailed hairstyle - short/long/shoulder-length]"
      color: "black hair"
      texture: "[straight/slightly wavy]"
      details: "[bangs/side-swept/neat/messy]"
    
    body:
      height: "[short/average/tall] for age"
      build: "[slim/athletic/average]"
      posture: "[confident/relaxed/curious]"
    
    outfit:
      top: "white school uniform shirt"
      bottom: "[navy blue pants/skirt]"
      accessories: "red scarf, [school badge/backpack]"
      shoes: "[sneakers/school shoes], [color]"
    
    personality_expression:
      default_emotion: "[cheerful/gentle/curious/confident]"
      energy_level: "[high/moderate/calm]"
      signature_gesture: "[specific hand gesture or movement]"
    
    animation_style: "Pixar-inspired 3D semi-realistic, expressive facial animation, natural movements"
    
    render_instruction: "Keep this exact design perfectly consistent in EVERY scene. Same face, same hair, same outfit, same proportions."

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

Animation notes: Mọi hình khối hình học phải chính xác (đáy tròn, chiều cao vuông góc, mặt xung quanh đúng tỷ lệ). 

⛔ ABSOLUTE BAN - TEXT/NUMBERS/FORMULAS:
  • KHÔNG hiển thị: chữ, số, công thức, ký hiệu toán học (e.g., "2/3 - (1/2 + 1/3)", "=", "+", "×", "√")
  • LÝ DO: AI video generators (Veo 3, Sora 2, Runway Gen-3, Pika 2.0) LUÔN LUÔN render sai công thức và số
  • VÍ DỤ SAI: Viết "2/3 - (1/2 + 1/3)" lên bảng → AI tạo ra "2/5 - (1/3 + 1/2)" hoặc ký hiệu lộn xộn
  • GIẢI PHÁP: 
    - Nhân vật NÓI: "hai phần ba trừ một nửa cộng một phần ba"
    - Nhân vật CHỈ TAY vào bảng trống hoặc vật thể trực quan (thanh phân số, hình khối màu)
    - Sử dụng biểu diễn TRỰC QUAN: thanh phân số bằng hình chữ nhật chia đoạn, đếm bằng ngón tay/vật thể
  • CHỈ ĐƯỢC: Hình ảnh trực quan + lời thoại + hành động cử chỉ

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

Scene description: [Overall context - characters present (use FULL character descriptions from Character consistency control), setting, objects visible, layout]

Characters in scene: [List each character with reference to their consistency control - e.g., "Nam (reference: Nam_student_consistent - 12-year-old boy, short black hair, brown eyes, bright smile, white uniform, navy pants)"]

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

Render control: 
  ⛔ ABSOLUTE BAN: Không text, không số, không công thức, không ký hiệu toán học
  ✅ CHỈ ĐƯỢC: Vật thể trực quan + hành động + cử chỉ nhân vật + lời thoại
  • VÍ DỤ: Thay vì viết "2/3" → dùng thanh phân số (hình chữ nhật chia 3 phần, tô 2 phần)
  • VÍ DỤ: Thay vì viết "5 + 3 = 8" → nhân vật đếm 5 ngón tay, thêm 3 ngón, nói "tám"

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
7. **CHARACTER CONSISTENCY (CRITICAL)**: 
   - Create DETAILED physical descriptions for each character in Character consistency control
   - Include: exact age, face shape, eye color/size, nose, mouth, skin tone, hair style/color/texture
   - Describe body height/build, outfit details, accessories
   - Add personality expression and signature gestures
   - Must be detailed enough for AI to recreate EXACT same character in every scene
   - Example level of detail: "12-year-old boy, round face, large brown eyes, button nose, bright cheerful smile, light Vietnamese skin tone, short black straight hair neatly combed, average height slim build, white uniform shirt, navy pants, red scarf, sneakers, cheerful energy, confident posture"
8. MAINTAIN STRICT CHARACTER VISUAL CONSISTENCY: Each character MUST appear IDENTICAL in ALL scenes - same face, same hair, same outfit, same proportions
9. MAINTAIN ENVIRONMENT CONSISTENCY: Same lighting (left-top, 5200K), same classroom layout, same props across ALL scenes
10. MAINTAIN AUDIO CONSISTENCY: Same ambient sounds, same volume ratios throughout
11. Each scene exactly 10 seconds
12. ⛔ ABSOLUTE BAN - NO TEXT/NUMBERS/FORMULAS VISIBLE IN VIDEO:
    - NO mathematical expressions (e.g., "2/3 - (1/2 + 1/3)", "x + y = z")
    - NO numbers written anywhere (e.g., "3", "15", "0.5")
    - NO text labels, subtitles, or captions
    - REASON: AI video generators (Veo 3, Sora 2, Runway Gen-3, Pika 2.0) ALWAYS render text/math INCORRECTLY
    - EXAMPLE WRONG: Show "2/3 - (1/2 + 1/3)" written on board → AI renders with wrong symbols/numbers
    - EXAMPLE CORRECT: Character says "hai phần ba trừ một nửa cộng một phần ba" while pointing at empty board OR showing visual fraction bars
    - ALL math content MUST be delivered through DIALOGUE and VISUAL ACTIONS only (fraction bars, shapes, counting with objects)
13. Focus on geometric accuracy for math/science content - use VISUAL representations, NOT written text
14. Use Continuity metadata in EVERY scene to link timeline
15. When describing characters in scenes, ALWAYS reference their full consistency control description from SETTING CHUNG
16. Transition types must be smooth and maintain visual continuity
17. **Pixar-inspired 3D style**: Semi-realistic, expressive facial animation, soft shadows, pastel color palette, natural movements`;

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
