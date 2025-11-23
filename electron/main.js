const { app, BrowserWindow, ipcMain, dialog, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const officeParser = require('officeparser');

let mainWindow;
// Better dev mode detection
const isDev = !app.isPackaged;

// Flow automation global stop flag
let stopFlowAutomation = false;

// ============================================
// UTILITY: Rate Limit Retry Handler
// ============================================

/**
 * Retry function with exponential backoff for rate limit errors
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} initialDelay - Initial delay in ms (default: 2000)
 * @returns {Promise} - Result of successful function call
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 2000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if it's a rate limit error (429)
            const isRateLimitError =
                error.message?.includes('429') ||
                error.message?.includes('Too Many Requests') ||
                error.message?.includes('quota') ||
                error.message?.includes('rate limit');

            if (!isRateLimitError) {
                // Not a rate limit error, throw immediately
                throw error;
            }

            // If this was the last attempt, throw
            if (attempt === maxRetries) {
                throw new Error(`Rate limit exceeded after ${maxRetries + 1} attempts. Please wait 1 minute and try again, or upgrade your Gemini API plan. Details: ${error.message}`);
            }

            // Calculate delay with exponential backoff
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(`⏳ Rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxRetries + 1})`);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

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

app.whenReady().then(() => {
    // Register custom protocol for local files
    protocol.registerFileProtocol('local', (request, callback) => {
        try {
            const url = request.url.substr(8); // Remove 'local://' prefix
            const filePath = decodeURIComponent(url);
            console.log('[Electron] Serving local file:', filePath);

            // Check if file exists
            if (fs.existsSync(filePath)) {
                callback({ path: filePath });
            } else {
                console.error('[Electron] File not found:', filePath);
                callback({ error: -6 }); // FILE_NOT_FOUND
            }
        } catch (error) {
            console.error('[Electron] Protocol error:', error);
            callback({ error: -2 }); // FAILED
        }
    });

    createWindow();
});

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

// Open file/folder with system default application
ipcMain.handle('open-file', async (event, filePath) => {
    try {
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        console.error('Error opening file:', error);
        return { success: false, error: error.message };
    }
});

// Generate content summary for preview
ipcMain.handle('generate-content-summary', async (event, { apiKey, content, source, model: selectedModel }) => {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        // Use user-selected model or fallback to highest quota model
        const modelToUse = selectedModel || "gemini-2.5-flash-lite";

        const model = genAI.getGenerativeModel({
            model: modelToUse,
            generationConfig: {
                maxOutputTokens: 16384,  // Increase for comprehensive 9-part analysis
                temperature: 0.7
            }
        });

        // Use more content for detailed analysis
        let analysisContent = content;
        if (content.length > 30000) {
            analysisContent = content.substring(0, 30000) + '\n\n[Nội dung tiếp theo...]';
        }

        const prompt = `Bạn là chuyên gia phân tích nội dung giáo dục toán học, chuyên sâu về sư phạm và thiết kế bài giảng hiệu quả.

🎯 NHIỆM VỤ: Phân tích TOÀN DIỆN nội dung file học liệu theo chuẩn sư phạm 9 phần

**NỘI DUNG CẦN PHÂN TÍCH:**

${analysisContent}

---

📋 CHUẨN ĐẦU RA - PHÂN TÍCH THEO 9 PHẦN SAU:

## 1️⃣ Giới thiệu tổng quan bài học 🎯

Tóm tắt ngắn gọn:
- Tên bài học, lớp học, chủ đề chương
- Mục tiêu chính của bài (học sinh sẽ nắm được gì, làm được gì)
- Đối tượng người học (ví dụ: học sinh lớp 8)
- Mục tiêu sư phạm cụ thể

Ví dụ: "Bài học giúp học sinh củng cố kiến thức về hình chóp đều, nhận biết các yếu tố cấu tạo, và áp dụng công thức tính diện tích – thể tích trong các tình huống thực tế."

---

## 2️⃣ Cấu trúc và logic sư phạm của bài học 🧱

Nhận ra và mô tả bố cục bài dạy theo trình tự logic giáo dục:
- **Phần khởi động:** Tạo hứng thú, kiểm tra kiến thức cũ
- **Phần kiến thức mới:** Ôn tập lý thuyết, giới thiệu khái niệm
- **Phần luyện tập:** Bài tập áp dụng
- **Phần vận dụng:** Bài toán thực tế
- **Phần củng cố:** Tổng kết, hướng dẫn về nhà

Chỉ rõ:
- Mục tiêu từng phần
- Hoạt động tương ứng (trò chơi, câu hỏi, nhóm thảo luận, bài tập)
- Cách liên kết giữa các phần

---

## 3️⃣ Nội dung kiến thức trọng tâm 📘

Trích lọc TOÀN BỘ kiến thức chính:
- **Định nghĩa và tính chất** quan trọng
- **Yếu tố cấu tạo** (ví dụ: đỉnh, mặt, cạnh, đường cao)
- **Đặc điểm nhận biết** (ví dụ: hình chóp đều có các cạnh bên bằng nhau)
- **Điều kiện áp dụng**
- **Điểm dễ nhầm lẫn**, lỗi sai học sinh hay gặp

Ví dụ: "Hình chóp tam giác đều có đáy là tam giác đều, các mặt bên là tam giác cân tại đỉnh S, đường cao hạ từ S vuông góc với trọng tâm đáy."

---

## 4️⃣ Hệ thống công thức và mối liên hệ ➗

Trích RA MỌI CÔNG THỨC xuất hiện:
- Viết lại dưới dạng chuẩn (ký hiệu toán học đúng)
- **Giải thích ý nghĩa** từng ký hiệu
- **Nêu mối liên hệ** giữa các công thức
- **Điều kiện áp dụng** từng công thức

Ví dụ:
- Diện tích xung quanh: S_xq = (1/2) × P_đáy × l
- Thể tích: V = (1/3) × S_đáy × h
- Giải thích: l là độ dài cạnh bên, h là đường cao từ đỉnh

---

## 5️⃣ Bài tập, ví dụ và ứng dụng thực tế 📝

Liệt kê CHI TIẾT:
- **Các dạng bài tập:** Trắc nghiệm, tự luận, bài toán thực tế
- **Tóm tắt đề bài:** Yêu cầu, dữ kiện, công thức cần dùng
- **Ý nghĩa thực tế:** Nếu có bài toán thực tế (chậu cây, túi quà, mái nhà...)
- **Phân loại độ khó:** Nhận biết, thông hiểu, vận dụng, vận dụng cao

Ví dụ:
- Bài 1: Hộp quà hình chóp tứ giác đều – tính thể tích và diện tích giấy cần
- Bài 2: Chậu cây hình chóp tam giác đều – tính thể tích và chi phí sơn

---

## 6️⃣ Hệ thống hóa kiến thức - Ghi nhớ nhanh ✍️

Tổng hợp kiến thức thành **GHI NHỚ NHANH:**
- Đặc điểm nhận biết quan trọng
- Các công thức cần thuộc lòng
- Mối quan hệ giữa các đại lượng
- Cách tính nhanh, mẹo nhớ

Ví dụ:
- "Hình chóp đều: đáy là đa giác đều, cạnh bên bằng nhau, đường cao đi qua tâm đáy"
- "Thể tích = (1/3) × diện tích đáy × chiều cao"

---

## 7️⃣ Phân tích mức độ nhận thức Bloom 🎓

Chia các phần theo mức độ tư duy:

| Mức độ | Hoạt động trong bài |
|--------|---------------------|
| **Nhận biết** | Nhận dạng hình, chọn đúng/sai |
| **Thông hiểu** | Giải thích khái niệm, nhắc lại tính chất |
| **Vận dụng** | Giải bài tập tính toán cơ bản |
| **Vận dụng cao** | Giải bài toán thực tế phức tạp |

---

## 8️⃣ Gợi ý storyboard hóa / thiết kế video 🎬

Đưa ra GỢI Ý CỤ THỂ:
- **Cách thể hiện hình ảnh:** Mô hình 3D, animation, highlight
- **Nhân vật và thoại:** Ai nói gì, ở cảnh nào
- **Cách nhấn mạnh khái niệm:** Visual, màu sắc, chuyển động
- **Hoạt động tương tác:** Thí nghiệm, đo đạc, vẽ hình

Ví dụ:
- "Dùng mô hình 3D minh họa quá trình rót cát vào hình chóp để hiểu công thức V = (1/3)Sh"
- "Nam và Linh cùng làm thí nghiệm đo chiều cao hình chóp bằng thước và mô hình giấy"

---

## 9️⃣ Kết luận & Hướng dẫn học sinh về nhà 🏡

Kết thúc bằng:
- **Tóm tắt 3-5 ý chính** cần nhớ
- **Gợi ý chuẩn bị bài mới**
- **Phần dặn dò** (nếu có trong file)

Ví dụ:
- "Ôn lại công thức tính thể tích và diện tích hình chóp"
- "Chuẩn bị bài mới: Hình chóp cụt và các hình không gian khác"

---

🎯 FORMAT ĐẦU RA:
- Markdown với emoji phân cấp rõ ràng
- Văn bản tự nhiên, mạch lạc, dễ hiểu
- Đầy đủ 9 phần như trên
- Chi tiết, cụ thể, có ví dụ minh họa

HÃY PHÂN TÍCH THEO ĐÚNG 9 PHẦN TRÊN!`;

        // Use retry logic for rate limit handling
        const analysisResult = await retryWithBackoff(async () => {
            return await model.generateContent(prompt);
        }, 3, 2000);
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

ipcMain.handle('generate-story-from-idea', async (event, { apiKey, idea, duration, wordCount, style, customInstructions, addBridgeScenes, hideFormulas, ensureContinuity, model: selectedModel }) => {
    try {
        // Send initial progress
        event.sender.send('progress-update', { progress: 0, status: 'Đang khởi tạo...' });

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        event.sender.send('progress-update', { progress: 10, status: 'Đang chuẩn bị AI model...' });

        // Build system instruction based on options
        let systemInstruction = `You are an expert educational video storyboard writer, specializing in creating detailed scene-by-scene scripts for mathematics education videos. Your expertise includes cinematography, visual storytelling, and educational content design.

🎨 MANDATORY STYLE: PIXAR-INSPIRED 3D ANIMATION
- ALL videos MUST be in Pixar-inspired 3D animated style (NOT live-action, NOT real people)
- Characters: Animated 3D characters with semi-realistic features, expressive eyes, soft lighting
- Animation quality: Smooth, natural movements, expressive facial animations
- Visual style: Colorful, warm, educational-friendly aesthetic similar to Pixar/Disney animations
- REASON: AI video generators render ANIMATED characters much more consistently than real people
- NO live-action footage, NO real human actors

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
- NO mathematical formulas visible in video
- NO geometric annotations or labels on shapes
- NO numbers displayed as text
- REASON: AI video generators (Veo, Sora, Runway) ALWAYS render text/math INCORRECTLY
- EXAMPLE BAD: "2/3 - (1/2 + 1/3)" written on board → AI renders wrong formula
- SOLUTION: Character speaks "hai phần ba trừ một nửa cộng một phần ba" while pointing at empty board
- ALL math content MUST be delivered through DETAILED DIALOGUE (voice) and VISUAL ACTIONS only
- Use visual representations: show fraction bars, geometric shapes, counting with fingers/objects

⚠️ CRITICAL - DIALOGUE REQUIREMENTS:
- Dialogue MUST be LONG, DETAILED, and COMPREHENSIVE
- Explain concepts thoroughly like a real teacher would
- Include: introduction → explanation → examples → reasoning → conclusion
- Don't worry about dialogue length (user will add voice-over later)
- Natural, conversational teaching style with complete sentences
- Multiple exchanges between characters if needed for clarity`;
        }

        if (ensureContinuity) {
            systemInstruction += ` Maintain strict CONTINUITY: consistent lighting (warm/natural), camera direction (left→right), character positions, and emotional flow across all scenes.`;
        }

        systemInstruction += ` Always write in Vietnamese, design for ANIMATED Vietnamese middle/high school student characters (Pixar 3D style) with red scarves. ALL characters MUST be 3D animated, NOT real people.`;

        // Use user-selected model or fallback to highest quota model (2.5 Flash Lite: 1,000 RPD)
        const modelToUse = selectedModel || "gemini-2.5-flash-lite";

        const model = genAI.getGenerativeModel({
            model: modelToUse,
            systemInstruction: systemInstruction
        });

        let stylePrompt = '';
        if (style && style !== '✨ Tùy chỉnh') {
            stylePrompt = `\nPhong cách hình ảnh: ${style}`;
        }

        // Calculate scenes and duration based on word count
        // ~200 words per main scene (Vietnamese reading speed)
        // Each main scene = ~10 seconds
        const wordsPerScene = 200;
        const mainSceneDuration = 10; // seconds per main scene
        const bridgeSceneDuration = 3; // seconds per bridge scene

        // Calculate number of main scenes based on word count
        numMainScenes = Math.max(3, Math.round(finalWordCount / wordsPerScene));

        let numBridgeScenes, sceneStructure, totalDuration;

        if (addBridgeScenes) {
            // Calculate with bridge scenes
            numBridgeScenes = Math.max(0, numMainScenes - 1); // bridges between main scenes
            const actualDuration = (numMainScenes * mainSceneDuration) + (numBridgeScenes * bridgeSceneDuration);
            sceneStructure = `${numMainScenes + numBridgeScenes} cảnh (${numMainScenes} chính + ${numBridgeScenes} bridge)`;
            totalDuration = `~${actualDuration}s (~${Math.round(actualDuration / 60 * 10) / 10} phút)`;
        } else {
            // Calculate without bridge scenes
            numBridgeScenes = 0;
            const actualDuration = numMainScenes * mainSceneDuration;
            sceneStructure = `${numMainScenes} cảnh`;
            totalDuration = `~${actualDuration}s (~${Math.round(actualDuration / 60 * 10) / 10} phút)`;
        }

        // Build advanced options description
        let advancedOptions = '';

        if (addBridgeScenes) {
            advancedOptions += '\n📍 CÓ CẢH BRIDGE: Thêm cảnh chuyển động tự nhiên giữa các cảnh chính để liên kết mượt mà.';
        }

        if (hideFormulas) {
            advancedOptions += '\n🚫 CẤM TEXT/CÔNG THỨC: TUYỆT ĐỐI KHÔNG hiển thị chữ/số/công thức trên màn hình. Thay bằng:\n   • Biểu diễn trực quan (thanh phân số, hình khối, đếm bằng ngón tay)\n   • THOẠI DÀI, CHI TIẾT từ nhân vật giải thích\n   • Hành động trực quan từ nhân vật';
        }

        if (ensureContinuity) {
            advancedOptions += '\n🔗 ĐẢM BẢO CONTINUITY CHẶT CHẼ:\n   • Ánh sáng 5200K không thay đổi (không vàng, không lạnh)\n   • Hướng bóng đổ nhất quán từ trái qua phải\n   • Vị trí nhân vật không "teleport" giữa các cảnh\n   • Props (bàn, ghế, đồ dùng) ở cùng vị trí\n   • Không cắt ngang hành động của nhân vật';
        }

        const prompt = `Hãy tạo storyboard video giáo dục toán học CHẤT LƯỢNG CAO cho chủ đề sau:

Chủ đề: ${idea}${stylePrompt}
${customInstructions ? `\nYêu cầu bổ sung: ${customInstructions}` : ''}

⚙️ CẤU HÌNH:${advancedOptions}

📋 CHUẨN STORYBOARD XUẤT:

🎬 CHUẨN STORYBOARD – "[Tiêu đề hấp dẫn]"

👥 Nhân vật:
[Tên]: [reference_tag: consistent]
  • Tuổi, khuôn mặt, mắt (màu sắc, biểu cảm)
  • Tóc, trang phục (áo, quần, khăn, giày)
  • Tính cách, cảm xúc
  • GIỮ NGUYÊN HÌNH DÁNG TRONG TOÀN BỘ STORYBOARD

🎨 Bối cảnh:
- Địa điểm: [lớp học/sân trường/...]
- Ánh sáng: Tự nhiên 5200K (không thay đổi)
- Âm thanh: Ambient nhẹ (không nhạc nền)
- Tông màu: Ấm, thân thiện

🎨 Phong cách: Hoạt hình Pixar 3D (KHÔNG người thật, KHÔNG live-action)

⏱️ Tổng thời lượng: ${totalDuration} (${sceneStructure})
${hideFormulas ? '⛔ QUAN TRỌNG: Không hiển thị text/công thức/số - tất cả qua thoại' : ''}

**Từng cảnh (định dạng ngắn gọn):**

${addBridgeScenes ? `🎞 CẢNH 1 (0–10s)
Goal: [Mục đích]
Setting: [Bối cảnh]
Action: [Hành động 0-3s] → [Hành động 3-7s] → [Freeze 7-10s]
Camera: [Mid-shot/Close-up + hướng di chuyển]
Dialogue: [Nhân vật A]: "[Thoại ngắn gọn nhưng đủ ý]"
          [Nhân vật B nếu có]: "[Thoại hoặc phản ứng]"
Emotion: [Tò mò/vui vẻ/tập trung]
Transition: [Cut/Fade sang cảnh tiếp]

🎞 CẢNH 1.5 (10–13s) - Bridge Scene
Goal: Chuyển động tự nhiên
Action: [Di chuyển ngắn gọn]
Camera: [Wide shot]
Transition: [Cut sang cảnh 2]

🎞 CẢNH 2 (13–23s)
[Tiếp tục format...]` : `🎞 CẢNH 1 (0–10s)
Goal: [Mục đích]
Setting: [Bối cảnh]
Action: [Hành động]
Camera: [Góc quay]
Dialogue: [Nhân vật]: "[Thoại]"
Emotion: [Cảm xúc]
Transition: [Chuyển cảnh]

🎞 CẢNH 2 (10–20s)
[Tiếp tục...]`}

✅ CÁCH THỰC HIỆN (BẮT BUỘC):
1. ⚠️ Tạo ĐÚNG ${numMainScenes} cảnh chính - không được nhiều hơn, không được ít hơn
${addBridgeScenes ? `2. Thêm ${numBridgeScenes} cảnh bridge (chuyển động tự nhiên giữa các cảnh chính)` : `2. KHÔNG thêm cảnh bridge - chỉ cảnh chính`}
3. Mỗi cảnh chính: ~10 giây, hành động cụ thể + thoại rõ ràng
${hideFormulas ? `4. 🚫 TUYỆT ĐỐI không viết chữ/số/công thức trên màn hình - dùng biểu diễn trực quan + thoại dài` : `4. Có thể hiển thị text/công thức nếu cần thiết`}
${ensureContinuity ? `5. Đảm bảo continuity: ánh sáng (5200K), bóng đổ, vị trí nhân vật, props không đổi giữa các cảnh` : `5. Chuyển cảnh tự nhiên`}
6. Thoại: Tự nhiên, dễ hiểu, khoa học chính xác

🚨 KIỂM TRA LẠI:
- Số cảnh chính = ${numMainScenes} ✓
- Có bridge scenes = ${addBridgeScenes} ✓
- Không có text/công thức = ${hideFormulas} ✓
- Continuity chặt chẽ = ${ensureContinuity} ✓

HÃY TẠO STORYBOARD TUÂN THEO ĐÚNG CẤU HÌNH TRÊN!`;

        event.sender.send('progress-update', { progress: 30, status: 'Đang gửi yêu cầu tới AI...' });

        // Use retry logic for rate limit handling
        const result = await retryWithBackoff(async () => {
            return await model.generateContent(prompt);
        }, 3, 2000); // Max 3 retries, starting with 2s delay

        event.sender.send('progress-update', { progress: 70, status: 'Đang xử lý phản hồi từ AI...' });

        const response = result.response;
        const text = response.text();

        event.sender.send('progress-update', { progress: 90, status: 'Hoàn tất tạo storyboard!' });

        return { success: true, story: text };
    } catch (error) {
        console.error('Error generating story:', error);
        event.sender.send('progress-update', { progress: 0, status: 'Lỗi: ' + error.message });
        return { success: false, error: error.message };
    }
});

ipcMain.handle('generate-story-from-url', async (event, { apiKey, url, sourceType, fileName, urlIdea, duration, wordCount, style, customInstructions, addBridgeScenes, hideFormulas, ensureContinuity, model: selectedModel }) => {
    try {
        event.sender.send('progress-update', { progress: 0, status: 'Đang khởi tạo...' });

        const { GoogleGenerativeAI } = await import('@google/generative-ai');

        let content = '';

        event.sender.send('progress-update', { progress: 10, status: sourceType === 'file' ? 'Đang đọc file...' : 'Đang tải nội dung từ URL...' });

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

        event.sender.send('progress-update', { progress: 20, status: 'Đang chuẩn bị AI model...' });

        const genAI = new GoogleGenerativeAI(apiKey);

        // Build system instruction based on options
        let systemInstruction = `You are an expert storyboard writer who transforms mathematical articles into detailed video scene scripts with camera angles, lighting, and character actions.

🎨 MANDATORY STYLE: PIXAR-INSPIRED 3D ANIMATION
- ALL videos MUST be in Pixar-inspired 3D animated style (NOT live-action, NOT real people)
- Characters: Animated 3D characters with semi-realistic features, expressive eyes, soft lighting
- Animation quality: Smooth, natural movements, expressive facial animations
- Visual style: Colorful, warm, educational-friendly aesthetic similar to Pixar/Disney animations
- REASON: AI video generators render ANIMATED characters much more consistently than real people
- NO live-action footage, NO real human actors

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
- NO geometric annotations or shape labels
- REASON: AI video generators render text/formulas INCORRECTLY
- SOLUTION: ALL content via DETAILED DIALOGUE + VISUAL ACTIONS only
- EXAMPLE: Character says "hai phần ba trừ một nửa" while showing fraction bars visually

⚠️ CRITICAL - DIALOGUE REQUIREMENTS:
- Dialogue MUST be LONG, DETAILED, and COMPREHENSIVE
- Explain concepts thoroughly like a real teacher would
- Include: introduction → explanation → examples → reasoning → conclusion
- Don't worry about dialogue length (user will add voice-over later)
- Natural, conversational teaching style
- Multiple exchanges between characters for better understanding`;
        }

        if (ensureContinuity) {
            systemInstruction += ` Maintain strict CONTINUITY: lighting, camera direction, character positions.`;
        }

        // Use user-selected model or fallback to highest quota model (2.5 Flash Lite: 1,000 RPD)
        const modelToUse = selectedModel || "gemini-2.5-flash-lite";

        const model = genAI.getGenerativeModel({
            model: modelToUse,
            systemInstruction: systemInstruction
        });

        let stylePrompt = '';
        if (style) {
            stylePrompt = `\nPhong cách hình ảnh: ${style}`;
        }

        // Calculate scenes and duration based on user input
        // ~200 words per main scene (Vietnamese reading speed)
        // Each main scene = ~10 seconds
        const wordsPerScene = 200;
        const mainSceneDuration = 10; // seconds per main scene
        const bridgeSceneDuration = 3; // seconds per bridge scene

        // Get final word count from duration or url input
        const finalWordCount = duration ? parseInt(duration) : (wordCount || 1000);

        // Calculate number of main scenes based on word count
        const numMainScenes = Math.max(3, Math.round(finalWordCount / wordsPerScene));

        let numBridgeScenes, sceneStructure, totalDuration;

        if (addBridgeScenes) {
            // Calculate with bridge scenes
            numBridgeScenes = Math.max(0, numMainScenes - 1);
            const actualDuration = (numMainScenes * mainSceneDuration) + (numBridgeScenes * bridgeSceneDuration);
            sceneStructure = `${numMainScenes + numBridgeScenes} cảnh (${numMainScenes} chính + ${numBridgeScenes} bridge)`;
            totalDuration = `~${actualDuration}s (~${Math.round(actualDuration / 60 * 10) / 10} phút)`;
        } else {
            // Calculate without bridge scenes
            numBridgeScenes = 0;
            const actualDuration = numMainScenes * mainSceneDuration;
            sceneStructure = `${numMainScenes} cảnh`;
            totalDuration = `~${actualDuration}s (~${Math.round(actualDuration / 60 * 10) / 10} phút)`;
        }

        const sourceLabel = sourceType === 'file' ? `file ${fileName}` : 'bài viết';

        // Build advanced options description
        let advancedOptions = '';

        if (addBridgeScenes) {
            advancedOptions += '\n📍 CÓ CẢH BRIDGE: Thêm cảnh chuyển động tự nhiên giữa các cảnh chính để liên kết mượt mà.';
        }

        if (hideFormulas) {
            advancedOptions += '\n🚫 CẤM TEXT/CÔNG THỨC: TUYỆT ĐỐI KHÔNG hiển thị chữ/số/công thức trên màn hình. Thay bằng:\n   • Biểu diễn trực quan (thanh phân số, hình khối, đếm bằng ngón tay)\n   • THOẠI DÀI, CHI TIẾT từ nhân vật giải thích\n   • Hành động trực quan từ nhân vật';
        }

        if (ensureContinuity) {
            advancedOptions += '\n🔗 ĐẢM BẢO CONTINUITY CHẶT CHẼ:\n   • Ánh sáng 5200K không thay đổi (không vàng, không lạnh)\n   • Hướng bóng đổ nhất quán từ trái qua phải\n   • Vị trí nhân vật không "teleport" giữa các cảnh\n   • Props (bàn, ghế, đồ dùng) ở cùng vị trí\n   • Không cắt ngang hành động của nhân vật';
        }

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

⚙️ CẤU HÌNH:${advancedOptions}

📋 CHUẨN STORYBOARD XUẤT:

**Yêu cầu chính:**
1. ⚠️ Tạo ĐÚNG ${numMainScenes} cảnh chính - không được nhiều hơn, không được ít hơn
${addBridgeScenes ? `2. Thêm ${numBridgeScenes} cảnh bridge (chuyển động tự nhiên giữa các cảnh chính)` : `2. KHÔNG thêm cảnh bridge - chỉ cảnh chính`}
3. Mỗi cảnh chính: ~10 giây, hành động cụ thể + thoại rõ ràng (tổng ${totalDuration})
${hideFormulas ? `4. 🚫 TUYỆT ĐỐI không viết chữ/số/công thức trên màn hình - dùng biểu diễn trực quan + thoại dài` : `4. Có thể hiển thị text/công thức nếu cần thiết`}
${ensureContinuity ? `5. Đảm bảo continuity: ánh sáng (5200K), bóng đổ, vị trí nhân vật, props không đổi giữa các cảnh` : `5. Chuyển cảnh tự nhiên`}
6. Phân tích nội dung: tìm điểm chính, chia thành ${numMainScenes} phần hợp lý
7. Mô tả: nhân vật (đeo khăn quàng đỏ), bối cảnh, camera, ánh sáng, hành động, beat plan
8. Thoại: Dài, chi tiết, giải thích kỹ càng như giáo viên thực tế

🚨 KIỂM TRA LẠI:
- Số cảnh chính = ${numMainScenes} ✓
- Có bridge scenes = ${addBridgeScenes} ✓
- Không có text/công thức = ${hideFormulas} ✓
- Continuity chặt chẽ = ${ensureContinuity} ✓

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

        event.sender.send('progress-update', { progress: 35, status: 'Đang phân tích nội dung...' });

        // Use retry logic for rate limit handling
        const result = await retryWithBackoff(async () => {
            return await model.generateContent(prompt);
        }, 3, 2000);

        event.sender.send('progress-update', { progress: 75, status: 'Đang tạo storyboard từ nội dung...' });

        const response = result.response;
        const text = response.text();

        event.sender.send('progress-update', { progress: 95, status: 'Hoàn tất tạo storyboard!' });

        return { success: true, story: text };
    } catch (error) {
        console.error('Error generating story from URL:', error);
        event.sender.send('progress-update', { progress: 0, status: 'Lỗi: ' + error.message });
        return { success: false, error: error.message };
    }
});

ipcMain.handle('generate-metadata', async (event, { apiKey, story }) => {
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite"  // Use highest quota model
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

// Save frame file from ArrayBuffer data
ipcMain.handle('save-frame-file', async (event, { filePath, arrayBuffer }) => {
    try {
        // Convert ArrayBuffer to buffer and write to file
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(filePath, buffer);
        return { success: true, filePath };
    } catch (error) {
        console.error('Error saving frame file:', error);
        return { success: false, error: error.message };
    }
});

// Delete file
ipcMain.handle('delete-file', async (event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return { success: true };
        } else {
            return { success: false, error: 'File not found' };
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        return { success: false, error: error.message };
    }
});

// Get app version
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// Select download directory for Flow automation and Veo3
ipcMain.handle('select-download-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Chọn thư mục lưu video'
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return {
            success: true,
            path: result.filePaths[0],
            canceled: false
        };
    }
    return {
        success: false,
        path: null,
        canceled: true
    };
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
// VIDEO MERGING - Concatenate video files
// ============================================

ipcMain.handle('merge-videos', async (event, { videoPaths, outputPath, outputFileName }) => {
    const { execSync } = require('child_process');

    try {
        // Validate inputs
        if (!videoPaths || videoPaths.length === 0) {
            throw new Error('No video paths provided');
        }

        if (!outputPath) {
            throw new Error('Output path not specified');
        }

        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Use provided filename or generate one
        const finalFileName = outputFileName || `merged_video_${Date.now()}.mp4`;
        const finalOutputPath = path.join(outputPath, finalFileName);

        console.log(`[Merge Videos] Merging ${videoPaths.length} videos...`);
        console.log(`[Merge Videos] Input videos: ${videoPaths.join(', ')}`);
        console.log(`[Merge Videos] Output: ${finalOutputPath}`);

        // Create concat file for FFmpeg
        const concatFilePath = path.join(outputPath, `concat_${Date.now()}.txt`);
        const concatContent = videoPaths
            .map(videoPath => `file '${videoPath.replace(/\\/g, '\\\\')}'`)
            .join('\n');

        fs.writeFileSync(concatFilePath, concatContent);
        console.log(`[Merge Videos] Concat file created: ${concatFilePath}`);

        // Run FFmpeg to merge videos
        const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy -y "${finalOutputPath}"`;

        console.log(`[Merge Videos] Running FFmpeg command...`);
        execSync(ffmpegCommand, { stdio: 'inherit' });

        console.log(`[Merge Videos] ✅ Videos merged successfully: ${finalOutputPath}`);

        // Clean up concat file
        try {
            fs.unlinkSync(concatFilePath);
        } catch (err) {
            console.warn(`[Merge Videos] Warning: Could not delete concat file: ${err.message}`);
        }

        return {
            success: true,
            outputPath: finalOutputPath,
            message: `Merged ${videoPaths.length} videos successfully`
        };

    } catch (error) {
        console.error('[Merge Videos] Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ============================================
// FLOW AUTOMATION - Batch Video Generation
// ============================================

// Cookie parser - Parse cookie string from browser to Puppeteer format
function parseCookieForPuppeteer(cookieString) {
    const cookies = [];

    // Split by '; ' to get individual cookies
    const pairs = cookieString.split('; ');

    console.log(`[Cookie Parser] Starting to parse ${pairs.length} cookie pairs...`);

    for (const pair of pairs) {
        const equalIndex = pair.indexOf('=');
        if (equalIndex === -1) {
            console.warn(`[Cookie Parser] Skipping invalid pair (no =): ${pair.substring(0, 50)}`);
            continue;
        }

        const name = pair.substring(0, equalIndex).trim();
        const value = pair.substring(equalIndex + 1).trim();

        if (!name || !value) {
            console.warn(`[Cookie Parser] Skipping empty name/value: ${name}`);
            continue;
        }

        // Clean cookie value first (remove control chars)
        let cleanValue = value.replace(/[\x00-\x1F\x7F]/g, '');
        if (cleanValue.length !== value.length) {
            console.warn(`[Cookie Parser] Cleaned ${value.length - cleanValue.length} control chars from ${name}`);
        }

        if (!cleanValue) {
            console.warn(`[Cookie Parser] ⚠ Skipping empty cookie value: ${name}`);
            continue;
        }

        // Create cookie object - SAME AS VALIDATION
        const cookie = {
            name: name,
            value: cleanValue,
            path: '/'
        };

        // Cookie source: https://labs.google/fx/vi/tools/flow
        if (name.startsWith('__Host-')) {
            // __Host- cookies: SKIP domain field (Chrome will use page domain)
            cookie.secure = true;
            cookie.httpOnly = true;
            // NO domain field for __Host- cookies
            console.log(`[Cookie Parser] __Host- cookie: ${name} (no domain)`);
        } else if (name.startsWith('__Secure-')) {
            // __Secure- cookies - use wildcard domain
            cookie.secure = true;
            cookie.httpOnly = true;
            cookie.domain = '.labs.google';
            console.log(`[Cookie Parser] __Secure- cookie: ${name}`);
        } else {
            // Regular cookies - use wildcard domain
            cookie.domain = '.labs.google';
            console.log(`[Cookie Parser] Regular cookie: ${name}`);
        }

        // Validate critical fields
        if (!cookie.name || !cookie.value) {
            console.warn(`[Cookie Parser] ⚠ Skipping invalid cookie: ${name}`);
            continue;
        }

        if (cookie.value.length > 4000) {
            console.warn(`[Cookie Parser] ⚠ Warning: ${name} is very long (${cookie.value.length} chars)`);
        }

        cookies.push(cookie);
    }

    const hostCount = cookies.filter(c => c.name.startsWith('__Host-')).length;
    const secureCount = cookies.filter(c => c.name.startsWith('__Secure-')).length;
    const regularCount = cookies.length - hostCount - secureCount;

    console.log(`[Cookie Parser] ✓ Parsed ${cookies.length} cookies total:`);
    console.log(`  - ${hostCount} __Host- cookies`);
    console.log(`  - ${secureCount} __Secure- cookies`);
    console.log(`  - ${regularCount} regular cookies`);

    return cookies;
}

// Download video helper
async function downloadVideoFromUrl(videoUrl, promptText, savePath, index) {
    try {
        const https = require('https');
        const sanitizedText = promptText
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 50);

        // FIXED: Use index directly (works for both number and string like "1.1")
        // No need to +1 since originalIndex is already the scene number
        const filename = `video_${index}_${sanitizedText}.mp4`;
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
        event.sender.send('progress-update', { progress: 0, status: 'Đang khởi tạo tạo prompt...' });

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        // Map model ID to actual Gemini model name
        const modelName = config.model || 'gemini-2.5-flash-lite';
        const model = genAI.getGenerativeModel({
            model: modelName
        });

        event.sender.send('progress-update', { progress: 10, status: 'Đang tính toán số lượng prompt...' });

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
  0–${Math.floor(sceneDuration / 3)}s: [Opening action]
  ${Math.floor(sceneDuration / 3)}–${Math.floor(sceneDuration * 2 / 3)}s: [Main action]
  ${Math.floor(sceneDuration * 2 / 3)}–${sceneDuration}s: [Closing/transition]

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

TTS Script (LONG, DETAILED, COMPREHENSIVE):
  [Character]: "[LONG detailed dialogue explaining the concept thoroughly - Include: introduction, explanation, examples, reasoning, conclusion. Don't worry about length, user will add voice-over later. Example: 'Các em chú ý nhé, giờ thầy sẽ giải thích chi tiết về định lý Pythagore. Đầu tiên, chúng ta cần hiểu rằng định lý này áp dụng cho tam giác vuông. Cụ thể là như thế nào? Trong một tam giác vuông, tổng bình phương của hai cạnh góc vuông sẽ bằng bình phương của cạnh huyền. Tại sao điều này quan trọng? Bởi vì nó giúp chúng ta tính toán độ dài các cạnh một cách chính xác...' - Keep going with full explanation]"
  [Character 2]: "[DETAILED response or question - Natural conversation style, ask for clarification, provide examples, discuss applications...]"
  [Continue with multiple exchanges if needed for complete understanding]

💡 CRITICAL - TTS SCRIPT REQUIREMENTS:
- TTS Script MUST be LONG, DETAILED, COMPREHENSIVE
- Explain like a real teacher in classroom (full sentences, examples, reasoning)
- Include: introduction → detailed explanation → concrete examples → analysis → conclusion
- Don't limit dialogue length (user will handle voice-over timing)
- Natural teaching conversation with back-and-forth exchanges
- Each character should contribute meaningfully to understanding

---

**CRITICAL RULES:**
1. Output as formatted TEXT with emoji headers (🧱 🎞️), NOT JSON
2. Generate SETTING CHUNG only ONCE at the beginning
3. Generate exactly ${numPrompts} scenes (one 🎞️ PROMPT block per scene)
4. Each scene exactly ${sceneDuration} seconds
5. Character consistency control MUST have DETAILED descriptions
6. Keep same characters, lighting, and environment throughout ALL scenes
7. ${config.setupOptions.linkScenes ? 'Link scenes smoothly with continuity metadata' : 'Each scene can be independent'}
8. NO text overlays, NO subtitles, NO numbers, NO formulas visible in video (all visual only)
9. TTS Script in ${config.language === 'vietnamese' ? 'Vietnamese' : 'English'}: LONG, DETAILED, COMPREHENSIVE dialogue
10. Maintain strict visual consistency across all scenes
11. 🎙️ INVEST IN TTS SCRIPT: Long explanations help viewers understand better, don't worry about length`;

        // Build user prompt
        let userPrompt = '';
        if (config.storyContent) {
            userPrompt = `Based on this story, create ${numPrompts} video scenes:\n\n${config.storyContent}`;
        } else {
            userPrompt = `Create ${numPrompts} video scenes for a ${config.storyType} video in ${config.style} style.`;
        }

        event.sender.send('progress-update', { progress: 25, status: `Đang tạo ${numPrompts} prompt video...` });

        // Use retry logic for rate limit handling
        const result = await retryWithBackoff(async () => {
            return await model.generateContent(systemPrompt + '\n\n' + userPrompt);
        }, 3, 2000);

        event.sender.send('progress-update', { progress: 70, status: 'Đang xử lý và format prompts...' });

        const response = await result.response;
        const text = response.text().trim();

        event.sender.send('progress-update', { progress: 95, status: `Hoàn tất tạo ${numPrompts} prompts!` });

        console.log(`✅ Generated structured prompts with SETTING CHUNG + ${numPrompts} scenes`);

        return {
            success: true,
            data: text  // Return raw formatted text, not JSON array
        };

    } catch (error) {
        console.error('Prompt generation error:', error);
        event.sender.send('progress-update', { progress: 0, status: 'Lỗi: ' + error.message });
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
        event.sender.send('progress-update', { progress: 0, status: 'Đang khởi tạo Character Bible...' });

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });  // Use highest quota model

        event.sender.send('progress-update', { progress: 15, status: 'Đang chuẩn bị mô tả nhân vật...' });

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

        event.sender.send('progress-update', { progress: 30, status: 'Đang tạo Character Bible...' });

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);

        event.sender.send('progress-update', { progress: 70, status: 'Đang xử lý Character Bible...' });

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

        event.sender.send('progress-update', { progress: 95, status: 'Hoàn tất Character Bible!' });

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
        event.sender.send('progress-update', { progress: 0, status: 'Lỗi: ' + error.message });
        return {
            success: false,
            error: error.message || 'Unknown error occurred'
        };
    }
});

// Generate Storyboard
ipcMain.handle('generate-storyboard', async (event, { context, idea, genre, aspectRatio, numScenes, characterBible, apiKey }) => {
    try {
        event.sender.send('progress-update', { progress: 0, status: 'Đang khởi tạo Storyboard...' });

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });  // Use highest quota model

        const calculatedScenes = numScenes || Math.ceil(idea.length / 100); // Auto-calculate if not provided

        event.sender.send('progress-update', { progress: 15, status: `Đang chuẩn bị tạo ${calculatedScenes} cảnh...` });

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

        event.sender.send('progress-update', { progress: 30, status: `Đang tạo ${calculatedScenes} cảnh storyboard...` });

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);

        event.sender.send('progress-update', { progress: 70, status: 'Đang xử lý storyboard...' });

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

        event.sender.send('progress-update', { progress: 95, status: `Hoàn tất ${validScenes.length} cảnh!` });

        console.log(`✅ Generated ${validScenes.length} scenes`);

        return {
            success: true,
            data: validScenes
        };

    } catch (error) {
        console.error('Storyboard generation error:', error);
        event.sender.send('progress-update', { progress: 0, status: 'Lỗi: ' + error.message });
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
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });  // Use highest quota model

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
ipcMain.handle('generate-structured-prompts', async (event, { storyboard, apiKey, model: selectedModel, enableDialogueSeconds, dialogueSeconds }) => {
    try {
        event.sender.send('progress-update', { progress: 0, status: 'Đang khởi tạo tạo prompt...' });

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);

        // Use selected model with fallback to default
        const modelToUse = selectedModel || "gemini-2.5-flash-lite";

        // Optimized: Use moderate token limit for concise output
        const model = genAI.getGenerativeModel({
            model: modelToUse,
            generationConfig: {
                maxOutputTokens: 16384,  // Optimized for concise, efficient prompts
                temperature: 0.6,  // Lower temp for more focused output
            }
        });

        event.sender.send('progress-update', { progress: 10, status: 'Đang phân tích storyboard...' });

        // Build system prompt with detailed template
        const dialogueDurationNote = enableDialogueSeconds && Number(dialogueSeconds) > 0
            ? `\n\n⏱️ RÀNG BUỘC THỜI LƯỢNG THOẠI QUAN TRỌNG:\n- Mỗi cảnh phải có tổng thời lượng THOẠI kéo dài khoảng ${Number(dialogueSeconds)} giây (±1 giây)\n- Tính toán: Tốc độ đọc tiếng Việt tự nhiên ≈ 2.5-3 từ/giây\n- Số từ cần viết: ~${Math.floor(Number(dialogueSeconds) * 2.5)} - ${Math.floor(Number(dialogueSeconds) * 3)} từ\n- Chia nhỏ lời thoại theo mốc thời gian trong Beat plan\n- Đảm bảo thoại đủ dài để lấp đầy ${Number(dialogueSeconds)} giây khi đọc với giọng tự nhiên`
            : '';

        const systemPrompt = `You are an expert video prompt creator for educational videos.

**BẮTBUỘC - OUTPUT FORMAT WITH EXACT STRUCTURE:**

First, generate ONCE at the beginning:

🧱 SETTING CHUNG

Phong cách: 3D Pixar animation (KHÔNG người thật, KHÔNG live-action)

Nhân vật:
  [Tên]: [Age], [Khuôn mặt], [Mắt], [Tóc], [Trang phục], [Tính cách]
  [Reference tag: [Name]_consistent - GIỮ NGUYÊN TRONG MỌI CẢNH]

Bối cảnh:
  - Lớp học Việt Nam, ánh sáng tự nhiên 5200K
  - Props: [Những đồ vật cấp thiết]
  - Màu sắc: Ấm, thân thiện
  - Âm thanh: Ambient nhẹ (KHÔNG nhạc nền)

⚠️ QUAN TRỌNG:
  - KHÔNG hiển thị text/số/công thức trên màn hình
  - Dùng biểu diễn trực quan + thoại chi tiết

---

Then for EACH scene, use this EXACT structure:

🎞️ PROMPT Scene [#]

Mục đích: [Học sinh sẽ học được gì]

Mô tả cảnh:
  - Nhân vật: [Tên - lấy từ SETTING CHUNG]
  - Bối cảnh: [Chi tiết vị trí, props]
  - Liên kết: [Tiếp từ scene trước nếu có]

Diễn biến (0-10s):
  • 0-3s: [Hành động 1]
  • 3-7s: [Hành động 2 + thoại]
  • 7-10s: [Kết thúc cảnh]

Camera: [Loại shot + hướng di chuyển]

Hành động: [Chi tiết cử chỉ, biểu cảm nhân vật]

Thoại (Tiếng Việt tự nhiên):
  [Tên nhân vật]: "[${enableDialogueSeconds ? `~${Math.floor(Number(dialogueSeconds) * 2.5)}-${Math.floor(Number(dialogueSeconds) * 3)} từ` : '~20-25 từ'}]"
  [Nhân vật khác nếu im lặng]: [Mô tả biểu cảm lắng nghe - KHÔNG thoại]

Không khí: [Tòng cảm xúc]

Transition: [Chuyển sang cảnh tiếp]

---

**BẮT BUỘC TUÂN THỦ:**
1. Luôn bắt đầu bằng: 🧱 SETTING CHUNG (chỉ 1 lần)
2. Sau đó các cảnh: 🎞️ PROMPT Scene # (mỗi cảnh riêng biệt)
3. Thoại: Toàn bộ TIẾNG VIỆT, tự nhiên, rõ ràng
4. Nhân vật im lặng: Mô tả biểu cảm lắng nghe - KHÔNG mở miệng như nói
5. Chia cảnh nếu thoại dài: Scene 1.1, 1.2, 1.3 (mỗi ~20 từ)
6. Xử lý HẾT SỰ các cảnh trong storyboard - KHÔNG được dừng giữa chừng

${dialogueDurationNote}`;

        const userPrompt = `Generate structured video prompts for this storyboard:\n\n${JSON.stringify(storyboard, null, 2)}`;

        event.sender.send('progress-update', { progress: 20, status: 'Đang tạo SETTING CHUNG...' });

        console.log('🎬 Generating structured prompts...');

        const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);

        event.sender.send('progress-update', { progress: 60, status: 'Đang tạo prompts cho từng cảnh...' });

        const response = await result.response;
        const text = response.text();

        event.sender.send('progress-update', { progress: 85, status: 'Đang hoàn thiện prompts...' });

        console.log('✅ Structured prompts generated');
        console.log(`📊 Output length: ${text.length} characters`);

        // Verify all scenes were generated
        const sceneMatches = text.match(/🎞️.*PROMPT.*Scene/gi);
        const sceneCount = sceneMatches ? sceneMatches.length : 0;
        console.log(`📝 Generated ${sceneCount} scene prompts`);

        // Warning if scene count seems low (but don't block - let user decide)
        if (sceneCount < 5) {
            console.warn(`⚠️ Warning: Only ${sceneCount} scenes generated. Output may be truncated.`);
        }

        event.sender.send('progress-update', { progress: 100, status: 'Hoàn tất tạo prompts!' });

        return {
            success: true,
            data: text.trim()
        };

    } catch (error) {
        console.error('Structured prompt generation error:', error);
        event.sender.send('progress-update', { progress: 0, status: 'Lỗi: ' + error.message });
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

// ==========================================
// VEO3 AUTOMATION - Generate Videos from Prompts
// ==========================================

// Validate Veo3 cookie - NEW SIMPLE APPROACH
// Instead of parsing cookie string, we launch browser with persistent profile
// User logs in ONCE manually, cookies persist forever
// COOKIE STRING VALIDATION - Import cookies to temporary browser
ipcMain.handle('validate-veo3-cookie', async (event, { cookieString }) => {
    const puppeteer = require('puppeteer-core');
    const path = require('path');

    if (!cookieString || !cookieString.trim()) {
        return {
            success: false,
            error: 'Cookie string trống!'
        };
    }

    try {
        console.log('[Validate] =====================================');
        console.log('[Validate] KIỂM TRA COOKIE');
        console.log('[Validate] =====================================');

        // Parse cookies - support both formats
        const cookies = [];
        const trimmedString = cookieString.trim();

        // Check format: semicolon = document.cookie, tab = DevTools TSV
        if (trimmedString.includes(';') && !trimmedString.includes('\t')) {
            // Format 1: document.cookie format (name=value; name2=value2)
            console.log('[Validate] Detected document.cookie format');
            const pairs = trimmedString.split(';');

            for (const pair of pairs) {
                const [name, ...valueParts] = pair.trim().split('=');
                if (name && valueParts.length > 0) {
                    const value = valueParts.join('='); // Rejoin in case value has '='
                    const trimmedName = name.trim();

                    // Determine domain based on cookie name
                    let domain = '.google.com';
                    if (trimmedName.includes('next-auth') || trimmedName === 'EMAIL' || trimmedName.startsWith('_ga')) {
                        domain = 'labs.google'; // labs.google specific cookies
                    }

                    cookies.push({
                        name: trimmedName,
                        value: value.trim(),
                        domain: domain,
                        path: '/',
                        secure: true,
                        httpOnly: false,
                        sameSite: 'Lax'
                    });
                }
            }
        } else {
            // Format 2: DevTools TSV format
            console.log('[Validate] Detected DevTools TSV format');
            const lines = trimmedString.split('\n');

            for (const line of lines) {
                const parts = line.trim().split('\t');
                if (parts.length >= 7) {
                    const cookie = {
                        name: parts[5],
                        value: parts[6],
                        domain: parts[0],
                        path: parts[2],
                        secure: parts[3] === 'TRUE' || parts[3] === '✓',
                        httpOnly: parts[4] === 'TRUE' || parts[4] === '✓',
                        sameSite: 'None'
                    };

                    // Set expiration if provided
                    if (parts[1] && parts[1] !== '0') {
                        cookie.expires = parseInt(parts[1]);
                    }

                    cookies.push(cookie);
                }
            }
        }

        console.log(`[Validate] Parsed ${cookies.length} cookies`);

        if (cookies.length === 0) {
            return {
                success: false,
                error: 'Không tìm thấy cookie hợp lệ! Vui lòng copy đúng format từ DevTools.'
            };
        }

        // Launch browser to test cookies
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized' // Maximize window
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            defaultViewport: null // Use full screen size
        });

        const page = await browser.newPage();

        // Maximize window
        const pages = await browser.pages();
        if (pages.length > 1) {
            await pages[0].close(); // Close blank page
        }

        // Set cookies before navigation - one by one
        console.log('[Validate] Đang set cookies...');
        let setCookieCount = 0;

        for (const cookie of cookies) {
            try {
                await page.setCookie(cookie);
                setCookieCount++;
                console.log(`[Validate] ✓ Set cookie: ${cookie.name}`);
            } catch (err) {
                console.log(`[Validate] ✗ Failed to set cookie ${cookie.name}: ${err.message}`);
            }
        }

        console.log(`[Validate] Set ${setCookieCount}/${cookies.length} cookies successfully`);

        // Navigate to Flow page
        console.log('[Validate] Đang mở trang Flow...');
        mainWindow.webContents.send('validation-progress', '🌐 Đang tải trang labs.google/flow...');

        await page.goto('https://labs.google/fx/vi/tools/flow', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('[Validate] Trang đã tải xong, đợi textarea xuất hiện...');
        console.log('[Validate] (Tổng thời gian kiểm tra: ~15-20 giây)');
        mainWindow.webContents.send('validation-progress', '✅ Trang đã tải xong! Đang kiểm tra trạng thái đăng nhập...');

        // Wait a bit for page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Close any popup/modal that might be blocking
        console.log('[Validate] Đóng popup nếu có...');
        mainWindow.webContents.send('validation-progress', '🔄 Đang đóng popup chào mừng (nếu có)...');

        let popupClosed = false;
        try {
            // Method 1: Press ESC key multiple times
            for (let i = 0; i < 3; i++) {
                await page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log('[Validate] Đã nhấn ESC 3 lần');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Method 2: Click X button (top-right of popup)
            // Popup is around 600px from left, X is at top-right
            await page.mouse.click(598, 209); // Click on X position from screenshot
            console.log('[Validate] Đã click vào vị trí nút X');
            await new Promise(resolve => setTimeout(resolve, 1000));
            popupClosed = true;

        } catch (e) {
            console.log('[Validate] Lỗi khi đóng popup:', e.message);
        }

        if (popupClosed) {
            console.log('[Validate] Popup đã đóng, đợi thêm 2s...');
            mainWindow.webContents.send('validation-progress', '✅ Popup đã đóng! Đang tìm giao diện tạo video...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // IMPROVED: Check multiple signs of successful login
        mainWindow.webContents.send('validation-progress', '🔍 Đang kiểm tra dấu hiệu đăng nhập thành công...');

        let isLoggedIn = false;
        let loginMethod = '';
        let retryCount = 0;
        const maxRetries = 15; // Increase to 15s for slow connections

        while (!isLoggedIn && retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Check every 1s

            // Method 1: Check for textarea (primary UI element)
            const textarea1 = await page.$('textarea#PINHOLE_TEXT_AREA_ELEMENT_ID').catch(() => null);
            const textarea2 = await page.$('textarea[placeholder*="Describe"]').catch(() => null);
            const textarea3 = await page.$('textarea[placeholder*="mô tả"]').catch(() => null);
            const anyTextarea = await page.$('textarea').catch(() => null);

            if (textarea1 || textarea2 || textarea3) {
                isLoggedIn = true;
                loginMethod = 'textarea found (primary)';
                break;
            }

            // Method 2: Check for user profile element (avatar/email in header)
            const userAvatar = await page.$('[aria-label*="Google Account"]').catch(() => null);
            const userMenu = await page.$('[aria-label*="profile"]').catch(() => null);

            if (userAvatar || userMenu) {
                // If we see user profile, login is successful even without textarea
                // Textarea might be loading or behind a modal
                console.log('[Validate] Found user profile element - login confirmed');
                isLoggedIn = true;
                loginMethod = 'user profile detected';

                // Try to find textarea one more time after confirming login
                if (anyTextarea) {
                    loginMethod = 'user profile + textarea';
                }
                break;
            }

            // Method 3: Check URL - if NOT redirected to login page, we're good
            const currentUrl = page.url();
            if (currentUrl.includes('/tools/flow') && !currentUrl.includes('signin') && !currentUrl.includes('login')) {
                // Still on Flow page (not redirected to login) - good sign
                console.log('[Validate] Still on Flow page, checking for any interactive elements...');

                // Look for ANY sign of loaded UI (buttons, inputs, etc.)
                const hasButton = await page.$('button').catch(() => null);
                const hasInput = await page.$('input').catch(() => null);

                if (hasButton || hasInput || anyTextarea) {
                    isLoggedIn = true;
                    loginMethod = 'Flow page loaded with UI elements';
                    break;
                }
            }

            // Method 4: Check page content for absence of "Sign in" text
            const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');
            const hasSignInText = pageText.toLowerCase().includes('sign in') ||
                pageText.toLowerCase().includes('đăng nhập');

            if (!hasSignInText && pageText.length > 100) {
                // No "Sign in" prompt and page has content - likely logged in
                console.log('[Validate] No sign-in prompt detected, page has content');
                isLoggedIn = true;
                loginMethod = 'no sign-in prompt on page';
                break;
            }

            retryCount++;
            const remainingTime = maxRetries - retryCount;
            console.log(`[Validate] Lần thử ${retryCount}/${maxRetries}... (còn ${remainingTime}s)`);
            mainWindow.webContents.send('validation-progress',
                `🔍 Đang kiểm tra đăng nhập... (${retryCount}/${maxRetries}s)`
            );
        }

        if (isLoggedIn) {
            console.log(`[Validate] ✓ Cookie hợp lệ! Đã đăng nhập thành công (${loginMethod})`);
            mainWindow.webContents.send('validation-progress', '✅ Đăng nhập thành công! Đang lấy thông tin tài khoản...');

            // Try to interact with textarea to confirm it's really usable
            try {
                const textarea = await page.$('textarea').catch(() => null);
                if (textarea) {
                    console.log('[Validate] Testing textarea interaction...');
                    await textarea.click();
                    await page.keyboard.type('test', { delay: 50 });
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Clear the test text
                    await page.keyboard.down('Control');
                    await page.keyboard.press('A');
                    await page.keyboard.up('Control');
                    await page.keyboard.press('Backspace');

                    console.log('[Validate] ✓ Textarea is interactive and ready');
                }
            } catch (e) {
                console.log('[Validate] Textarea interaction test skipped:', e.message);
                // Not critical - login is confirmed by other methods
            }

            // Extract email from cookies
            const pageCookies = await page.cookies();
            const emailCookie = pageCookies.find(c => c.name === 'EMAIL');
            let email = 'Unknown User';
            if (emailCookie) {
                try {
                    email = decodeURIComponent(emailCookie.value).replace(/"/g, '');
                    console.log('[Validate] Extracted email:', email);
                } catch (e) {
                    console.log('[Validate] Email extraction failed:', e.message);
                }
            }

            // Also try to get email from page content
            if (email === 'Unknown User') {
                try {
                    const userEmail = await page.evaluate(() => {
                        // Try to find email in various common locations
                        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
                        const bodyText = document.body.innerText;
                        const match = bodyText.match(emailPattern);
                        return match ? match[0] : null;
                    });
                    if (userEmail) {
                        email = userEmail;
                        console.log('[Validate] Extracted email from page:', email);
                    }
                } catch (e) {
                    console.log('[Validate] Page email extraction failed:', e.message);
                }
            }

            await browser.close();

            return {
                success: true,
                email: email,
                cookieString: cookieString.trim(),
                message: `✓ Cookie hợp lệ! Tài khoản: ${email}`
            };
        } else {
            console.log('[Validate] ✗ Không phát hiện dấu hiệu đăng nhập sau 15s');
            console.log('[Validate] Đang phân tích chi tiết trạng thái trang...');
            mainWindow.webContents.send('validation-progress', '⚠️ Đang phân tích lỗi...');

            // Detailed page analysis
            const title = await page.title();
            const url = page.url();
            const pageText = await page.evaluate(() => document.body.innerText).catch(() => '');

            console.log('[Validate] ===== PAGE DEBUG INFO =====');
            console.log('[Validate] Page title:', title);
            console.log('[Validate] Page URL:', url);
            console.log('[Validate] Page text length:', pageText.length);
            console.log('[Validate] First 500 chars:', pageText.substring(0, 500));

            // Check for specific login indicators
            const hasSignInButton = await page.$('button:has-text("Sign in")').catch(() => null) ||
                await page.$('a:has-text("Sign in")').catch(() => null);
            const hasSignInText = pageText.toLowerCase().includes('sign in') ||
                pageText.toLowerCase().includes('đăng nhập');
            const hasErrorMessage = pageText.toLowerCase().includes('error') ||
                pageText.toLowerCase().includes('lỗi');

            console.log('[Validate] Has Sign In button:', !!hasSignInButton);
            console.log('[Validate] Has Sign In text:', hasSignInText);
            console.log('[Validate] Has error message:', hasErrorMessage);

            // Count elements on page
            const elementCounts = await page.evaluate(() => ({
                textareas: document.querySelectorAll('textarea').length,
                buttons: document.querySelectorAll('button').length,
                inputs: document.querySelectorAll('input').length,
                divs: document.querySelectorAll('div').length,
                totalElements: document.querySelectorAll('*').length
            }));

            console.log('[Validate] Element counts:', elementCounts);

            // Get all textarea details if any exist
            if (elementCounts.textareas > 0) {
                const textareaDetails = await page.evaluate(() => {
                    const areas = Array.from(document.querySelectorAll('textarea'));
                    return areas.map(t => ({
                        id: t.id,
                        placeholder: t.placeholder,
                        name: t.name,
                        visible: !!(t.offsetWidth || t.offsetHeight || t.getClientRects().length),
                        disabled: t.disabled
                    }));
                });
                console.log('[Validate] Textarea details:', JSON.stringify(textareaDetails, null, 2));
            }

            // Take screenshot for debugging
            const screenshotPath = path.join(app.getPath('userData'), 'validation-failed.png');
            try {
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log('[Validate] Screenshot saved to:', screenshotPath);
            } catch (e) {
                console.log('[Validate] Screenshot failed:', e.message);
            }

            await browser.close();

            // Determine specific error message
            let errorMessage = 'Không thể xác nhận đăng nhập thành công.\n\n';

            if (hasSignInButton || hasSignInText) {
                errorMessage += '❌ Phát hiện: Cookie đã hết hạn hoặc không hợp lệ\n';
                errorMessage += '→ Vui lòng lấy cookie mới từ DevTools';
            } else if (elementCounts.textareas > 0) {
                errorMessage += '⚠️ Tìm thấy textarea nhưng không khớp selector\n';
                errorMessage += '→ Google có thể đã thay đổi giao diện\n';
                errorMessage += `→ Textarea details: ${JSON.stringify(elementCounts)}`;
            } else if (elementCounts.totalElements < 50) {
                errorMessage += '⚠️ Trang tải không đầy đủ (quá ít elements)\n';
                errorMessage += '→ Kết nối mạng có thể bị chậm\n';
                errorMessage += '→ Thử lại sau vài phút';
            } else if (hasErrorMessage) {
                errorMessage += '⚠️ Phát hiện thông báo lỗi trên trang\n';
                errorMessage += '→ Google Labs có thể đang bảo trì\n';
                errorMessage += '→ Thử lại sau';
            } else {
                errorMessage += '⚠️ Không xác định được lỗi cụ thể\n';
                errorMessage += '→ Xem screenshot để debug: ' + screenshotPath;
            }

            return {
                success: false,
                error: errorMessage
            };
        }

    } catch (error) {
        console.error('[Validate] Error:', error);
        return {
            success: false,
            error: `Lỗi: ${error.message}`
        };
    }
});

// Stop Veo3 automation handler
ipcMain.on('stop-veo3-automation', () => {
    console.log('Received stop Veo3 automation signal');
    stopFlowAutomation = true;

    // Send immediate stop confirmation to UI
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
        if (window && !window.isDestroyed()) {
            window.webContents.send('veo3:log', {
                promptId: null,
                message: '🛑 Đã nhận lệnh dừng - đang dừng tất cả tiến trình...',
                status: 'error'
            });
        }
    });
});

// Start Veo3 automation
ipcMain.handle('start-veo3-automation', async (event, { prompts, cookieString, videoConfig, autoSaveConfig }) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return;

    stopFlowAutomation = false;
    let processedCount = 0;

    // Log helper function
    const logMessage = (promptId, message, status, videoUrl = null) => {
        const logData = {
            promptId,
            message,
            status, // 'running' | 'processing' | 'success' | 'error'
            videoUrl
        };

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('veo3:log', logData);
            console.log(`[Veo3 Backend] Sent log to frontend:`, JSON.stringify(logData));
        } else {
            console.log(`[Veo3 Backend] ⚠️ Cannot send log - mainWindow destroyed or not found`);
        }

        console.log(`[Veo3 ${promptId || 'general'}] ${message}`);
    };

    try {
        logMessage(null, 'Đang khởi động Veo3 automation...', 'running');

        // Log video configuration
        logMessage(null, `Cấu hình: Model=${videoConfig?.model || 'veo3-fast'}, Aspect=${videoConfig?.aspectRatio || '16:9'}, Output=${videoConfig?.outputCount || 1}`, 'running');

        // Parse cookies - USE SAME LOGIC AS VALIDATION (NOT parseCookieForPuppeteer!)
        logMessage(null, 'Đang parse cookies...', 'running');
        const cookies = [];
        const trimmedString = cookieString.trim();

        // Check format: semicolon = document.cookie, tab = DevTools TSV
        if (trimmedString.includes(';') && !trimmedString.includes('\t')) {
            // Format 1: document.cookie format (name=value; name2=value2)
            console.log('[Veo3] Detected document.cookie format');
            const pairs = trimmedString.split(';');

            for (const pair of pairs) {
                const [name, ...valueParts] = pair.trim().split('=');
                if (name && valueParts.length > 0) {
                    const value = valueParts.join('=');
                    const trimmedName = name.trim();

                    // Determine domain based on cookie name
                    let domain = '.google.com';
                    if (trimmedName.includes('next-auth') || trimmedName === 'EMAIL' || trimmedName.startsWith('_ga')) {
                        domain = 'labs.google';
                    }

                    cookies.push({
                        name: trimmedName,
                        value: value.trim(),
                        domain: domain,
                        path: '/',
                        secure: true,
                        httpOnly: false,
                        sameSite: 'Lax'
                    });
                }
            }
        } else {
            // Format 2: DevTools TSV format
            console.log('[Veo3] Detected DevTools TSV format');
            const lines = trimmedString.split('\n');

            for (const line of lines) {
                const parts = line.trim().split('\t');
                if (parts.length >= 7) {
                    const cookie = {
                        name: parts[5],
                        value: parts[6],
                        domain: parts[0],
                        path: parts[2],
                        secure: parts[3] === 'TRUE' || parts[3] === '✓',
                        httpOnly: parts[4] === 'TRUE' || parts[4] === '✓',
                        sameSite: 'None'
                    };

                    if (parts[1] && parts[1] !== '0') {
                        cookie.expires = parseInt(parts[1]);
                    }

                    cookies.push(cookie);
                }
            }
        }

        logMessage(null, `Đã parse ${cookies.length} cookies`, 'running');

        if (cookies.length === 0) {
            throw new Error('Không tìm thấy cookie hợp lệ! Vui lòng kiểm tra lại cookie string.');
        }

        // Import Puppeteer
        const puppeteer = require('puppeteer-core');

        // Launch browser (SAME AS VALIDATION)
        logMessage(null, 'Đang khởi động Chromium...', 'running');
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized'
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            defaultViewport: null
        });

        const page = await browser.newPage();

        // Set cookies BEFORE navigation (SAME AS VALIDATION)
        logMessage(null, 'Đang set cookies...', 'running');

        let setCookieCount = 0;

        for (const cookie of cookies) {
            try {
                await page.setCookie(cookie);
                setCookieCount++;
                console.log(`[Veo3] ✓ Set cookie: ${cookie.name}`);
            } catch (err) {
                console.log(`[Veo3] ✗ Failed to set cookie ${cookie.name}: ${err.message}`);
            }
        }

        console.log(`[Veo3] Set ${setCookieCount}/${cookies.length} cookies successfully`);

        if (setCookieCount === 0) {
            await browser.close();
            throw new Error('Không thể set bất kỳ cookie nào! Vui lòng kiểm tra lại cookie string.');
        }

        // Navigate to FLOW with cookies (SAME AS SETTINGS)
        logMessage(null, 'Đang truy cập Google Flow với cookies...', 'running');
        await page.goto('https://labs.google/fx/vi/tools/flow', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        logMessage(null, 'Đã tải trang Flow thành công', 'running');

        // Wait for page to fully render (SAME AS SETTINGS)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Close popup if exists (SAME AS SETTINGS)
        logMessage(null, 'Đang đóng popup nếu có...', 'running');
        try {
            // Press ESC 3 times
            for (let i = 0; i < 3; i++) {
                await page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log('[Veo3] Đã nhấn ESC 3 lần');
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Click X button
            await page.mouse.click(598, 209);
            console.log('[Veo3] Đã click vào vị trí nút X');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
            console.log('[Veo3] Lỗi khi đóng popup:', err.message);
        }

        logMessage(null, `🚀 Sẵn sàng xử lý ${prompts.length} prompts`, 'running');

        // Fixed textarea selector (from Flow UI)
        const textareaSelector = 'textarea#PINHOLE_TEXT_AREA_ELEMENT_ID';

        // Process each prompt
        for (let i = 0; i < prompts.length && !stopFlowAutomation; i++) {
            const prompt = prompts[i];
            logMessage(prompt.id, `[${i + 1}/${prompts.length}] Đang xử lý prompt`, 'processing');

            // Check stop flag before each prompt
            if (stopFlowAutomation) {
                logMessage(null, '🛑 Đã nhận lệnh dừng - dừng xử lý prompts', 'error');
                break;
            }

            // QUEUE CONTROL: From scene 2 onwards, optionally wait for previous scene's frame file
            if (i > 0 && !stopFlowAutomation) {
                try {
                    const useExtractedFrames = !!(videoConfig && videoConfig.useExtractedFrames);
                    if (!useExtractedFrames) {
                        console.log(`[Veo3 Queue] Skipping frame wait (useExtractedFrames = false)`);
                    }

                    if (!useExtractedFrames) {
                        // Skip waiting entirely
                        // Proceed without extracted frame
                    } else {
                        // SIMPLE & ROBUST: Just wait for the immediately previous prompt in the array
                        // This works for both normal scenes (1, 2, 3) and sub-scenes (1.1, 1.2, 2.1)
                        const prevPrompt = prompts[i - 1];
                        const prevSceneIndex = prevPrompt?.originalIndex || (i - 1);

                        console.log(`[Veo3 Queue] Current scene: ${prompt.originalIndex}, waiting for previous scene: ${prevSceneIndex}`);

                        const frameDir = autoSaveConfig && autoSaveConfig.path ? autoSaveConfig.path : null;
                        const pollIntervalMs = 5000; // 5s

                        if (frameDir && fs.existsSync(frameDir)) {
                            let detectedPath = null;
                            logMessage(prompt.id, `⏳ [QUEUE] Đang chờ scene ${prevSceneIndex} hoàn thành và lưu khung hình...`, 'processing');

                            // Poll indefinitely until frame is found or user stops
                            while (!stopFlowAutomation) {
                                try {
                                    const allFiles = fs.readdirSync(frameDir);
                                    const jpgFiles = allFiles.filter(name => name.toLowerCase().endsWith('.jpg'));
                                    const searchPattern = `frame_scene_scene-${prevSceneIndex}_`;
                                    const matchedFiles = jpgFiles.filter(name => name.includes(searchPattern));

                                    console.log(`[Veo3 Debug] Looking for scene ${prevSceneIndex} frame:`);
                                    console.log(`[Veo3 Debug] - Frame directory: ${frameDir}`);
                                    console.log(`[Veo3 Debug] - Search pattern: ${searchPattern}`);
                                    console.log(`[Veo3 Debug] - Total files in dir: ${allFiles.length}`);
                                    console.log(`[Veo3 Debug] - JPG files found: ${jpgFiles.length}`);
                                    console.log(`[Veo3 Debug] - Matched files: ${matchedFiles.length}`);
                                    if (jpgFiles.length > 0) {
                                        console.log(`[Veo3 Debug] - Sample JPG files:`, jpgFiles.slice(0, 5));
                                    }

                                    if (matchedFiles.length > 0) {
                                        // Pick latest by mtime
                                        const latest = matchedFiles
                                            .map(name => ({ name, mtime: fs.statSync(path.join(frameDir, name)).mtime.getTime() }))
                                            .sort((a, b) => b.mtime - a.mtime)[0];
                                        detectedPath = path.join(frameDir, latest.name);

                                        if (detectedPath && fs.existsSync(detectedPath)) {
                                            prompt.extractedFrame = detectedPath;
                                            logMessage(prompt.id, `✅ [QUEUE] Đã phát hiện khung hình từ scene ${prevSceneIndex}: ${path.basename(detectedPath)}`, 'processing');
                                            break; // Frame found, exit wait loop
                                        }
                                    }
                                } catch (pollErr) {
                                    console.log(`[Veo3] Poll error (will retry): ${pollErr.message}`);
                                }

                                // Wait 5s before next poll
                                await new Promise(r => setTimeout(r, pollIntervalMs));

                                // Log waiting status every 30s
                                const elapsed = Math.floor((Date.now() - (prompt._queueStartTime || Date.now())) / 1000);
                                if (elapsed > 0 && elapsed % 30 === 0) {
                                    logMessage(prompt.id, `⏳ [QUEUE] Vẫn đang chờ scene ${prevSceneIndex}... (đã chờ ${Math.floor(elapsed / 60)} phút)`, 'processing');
                                }

                                if (!prompt._queueStartTime) {
                                    prompt._queueStartTime = Date.now();
                                }
                            }

                            // If stopped while waiting
                            if (stopFlowAutomation) {
                                logMessage(prompt.id, `🛑 [QUEUE] Đã dừng trong khi chờ scene ${prevSceneIndex}`, 'error');
                                break;
                            }
                        }
                    }
                } catch (waitErr) {
                    console.log('[Veo3] Queue wait error:', waitErr.message);
                    logMessage(prompt.id, `⚠️ [QUEUE] Lỗi khi chờ: ${waitErr.message}`, 'processing');
                }
            }

            if (prompt.extractedFrame && fs.existsSync(prompt.extractedFrame) && videoConfig && videoConfig.useExtractedFrames) {
                logMessage(prompt.id, `🖼️ Dang tai len tu khung hinh scene truoc: ${path.basename(prompt.extractedFrame)}`, 'processing');

                try {
                    // 4.5.1: Click "Từ văn bản sang video" combobox to open dropdown
                    logMessage(prompt.id, 'Dang mo menu "Tu van ban sang video"...', 'processing');
                    await page.evaluate(() => {
                        const normalize = (s) => (s || '')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase();

                        // Prefer role combobox, but fallback to the first combobox if text match fails
                        const comboboxes = Array.from(document.querySelectorAll('button[role="combobox"], [role="combobox"]'));
                        let target = comboboxes.find(btn => normalize(btn.textContent).includes('tu van ban sang video'));
                        if (!target) target = comboboxes.find(btn => normalize(btn.textContent).includes('text to video'));

                        if (!target && comboboxes.length > 0) {
                            // Fallback: click the first combobox (Flow typically has the source combobox visible)
                            target = comboboxes[0];
                            console.log('[Veo3] Fallback: clicking first combobox');
                        }

                        if (target && typeof target.click === 'function') {
                            target.scrollIntoView({ block: 'center', inline: 'center' });
                            target.click();
                            console.log('[Veo3] Clicked "Tu van ban sang video" button');
                            return true;
                        }
                        console.log('[Veo3] Could not find any combobox to open source menu');
                        return false;
                    });
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // 4.5.2: Select "Tạo video từ các khung hình" option
                    logMessage(prompt.id, 'Dang chon "Tao video tu cac khung hinh"...', 'processing');
                    await page.evaluate(() => {
                        const normalize = (s) => (s || '')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase();

                        // Collect menu options broadly
                        const options = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"], [data-radix-collection-item], button, li'));

                        let target = options.find(el => normalize(el.textContent).includes('tao video tu cac khung hinh'));
                        if (!target) target = options.find(el => normalize(el.textContent).includes('create video from frames'));
                        if (!target) target = options.find(el => normalize(el.textContent).includes('frames'));

                        if (target && typeof target.click === 'function') {
                            target.scrollIntoView({ block: 'center', inline: 'center' });
                            target.click();
                            console.log('[Veo3] Selected "Tao video tu cac khung hinh"');
                            return true;
                        }
                        console.log('[Veo3] Could not find frames option in menu');
                        return false;
                    });
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // 4.5.3: Click "+" (add) button
                    logMessage(prompt.id, 'Dang click nut "+" de them khung hinh...', 'processing');
                    await page.evaluate(() => {
                        const button = document.evaluate('/html/body/div/div[2]/div/div/div[2]/div/div[1]/div[2]/div/div/div[2]/div[1]/div/div[1]/button', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (button) {
                            button.click();
                            console.log('[Veo3] Clicked "+" add button via XPath');
                            return true;
                        } else {
                            console.log('[Veo3] Không tìm thấy phần tử với XPath!');
                            return false;
                        }
                    });
                    await new Promise(resolve => setTimeout(resolve, 1500));


                    // 4.5.4: Click "Tải lên" (upload) button
                    // logMessage(prompt.id, 'Đang click nút "Tải lên"...', 'processing');
                    // await page.evaluate(() => {
                    //     const buttons = Array.from(document.querySelectorAll('button'));
                    //     const uploadButton = buttons.find(btn => {
                    //         const icon = btn.querySelector('i.google-symbols');
                    //         return icon && icon.textContent === 'upload';
                    //     });
                    //     if (uploadButton) {
                    //         uploadButton.click();
                    //         console.log('[Veo3] Clicked "Tải lên" upload button');
                    //         return true;
                    //     }
                    //     return false;
                    // });
                    // //Đóng cửa sổ chọn File vừa hiện lên
                    // await page.evaluate(() => {
                    //     const windowFileChooser = document.querySelector('window.file-chooser');
                    //     if (windowFileChooser) {
                    //         windowFileChooser.close();
                    //     }
                    // });
                    // await new Promise(resolve => setTimeout(resolve, 1000));

                    // 4.5.5: Click "Tôi đồng ý" in dialog if it appears
                    logMessage(prompt.id, 'Dang click "Toi dong y"...', 'processing');
                    try {
                        await page.evaluate(() => {
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const agreeButton = buttons.find(btn =>
                                btn.textContent.includes('Toi dong y')
                            );
                            if (agreeButton) {
                                agreeButton.click();
                                console.log('[Veo3] Clicked "Toi dong y" button');
                                return true;
                            }
                            return false;
                        });
                    } catch (err) {
                        console.log('[Veo3] No "Toi dong y" dialog found, continuing...');
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // 4.5.6: Upload the frame file using input[type=file] or file chooser
                    logMessage(prompt.id, `Dang tai len file: ${path.basename(prompt.extractedFrame)}...`, 'processing');

                    // Prefer setInputFiles on a visible input[type=file]
                    let uploaded = false;
                    try {
                        // Wait up to 7s for an input[type=file] to exist
                        await page.waitForSelector('input[type="file"]', { timeout: 7000 });
                        const inputs = await page.$$('input[type="file"]');
                        if (inputs && inputs.length > 0) {
                            // Use the first input (Flow UI usually mounts one in the upload area)
                            await inputs[0].uploadFile(prompt.extractedFrame);
                            uploaded = true;
                            console.log('[Veo3] File uploaded via setInputFiles');
                            logMessage(prompt.id, '✅ Đã tải lên bằng input file (setInputFiles)', 'processing');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    } catch (_) { /* ignore and fallback */ }



                    // 4.5.7: Click "Cắt và lưu" button
                    logMessage(prompt.id, 'Đang click "Cắt và lưu"...', 'processing');
                    await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const cropButton = buttons.find(btn => {
                            const icon = btn.querySelector('i.material-icons');
                            const text = btn.textContent;
                            return icon && icon.textContent === 'crop' && text.includes('Cắt và lưu');
                        });
                        if (cropButton) {
                            cropButton.click();
                            console.log('[Veo3] Clicked "Cắt và lưu" button');
                            return true;
                        }
                        return false;
                    });

                    // 4.5.8: Wait 10 seconds for processing
                    logMessage(prompt.id, 'Đang đợi xử lý khung hình (10 giây)...', 'processing');
                    await new Promise(resolve => setTimeout(resolve, 10000));

                    logMessage(prompt.id, '✅ Đã tải lên và xử lý khung hình thành công', 'processing');

                } catch (uploadError) {
                    console.error('[Veo3] ❌ Lỗi khi tải lên khung hình:', uploadError);
                    logMessage(prompt.id, `⚠️ Không thể tải lên khung hình: ${uploadError.message}`, 'processing');
                    // Continue with text-only prompt
                }
            } else if (prompt.extractedFrame) {
                console.log('[Veo3] ⚠️ Extracted frame file not found:', prompt.extractedFrame);
                logMessage(prompt.id, '⚠️ File khung hình không tồn tại, tiếp tục với text-only', 'processing');
            }

            try {
                // STEP 1: Click "+ Dự án mới" ONLY for FIRST prompt (all prompts are in ONE project)
                if (i === 0) {
                    logMessage(prompt.id, 'Đang nhấp nút "+ Dự án mới"...', 'processing');

                    // Try to find and click the button
                    const newProjectButtonClicked = await page.evaluate(() => {
                        // Try multiple ways to find the button
                        const buttons = Array.from(document.querySelectorAll('button'));

                        // Method 1: Find by text content
                        let targetButton = buttons.find(btn => btn.textContent.includes('Dự án mới'));

                        // Method 2: Find by icon (add_2)
                        if (!targetButton) {
                            targetButton = buttons.find(btn => {
                                const icon = btn.querySelector('i.google-symbols');
                                return icon && icon.textContent === 'add_2';
                            });
                        }

                        if (targetButton) {
                            targetButton.click();
                            console.log('[Veo3] Clicked "+ Dự án mới" button');
                            return true;
                        }

                        return false;
                    });

                    if (newProjectButtonClicked) {
                        console.log('[Veo3] ✓ Đã nhấp nút "+ Dự án mới"');
                    } else {
                        console.log('[Veo3] ⚠ Không tìm thấy nút "+ Dự án mới", có thể đã ở giao diện tạo project');
                    }

                    // STEP 2: Wait 5s for UI to load (only for first prompt)
                    logMessage(prompt.id, 'Đợi giao diện tải (5 giây)...', 'processing');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    // For subsequent prompts, just log that we're continuing in the same project
                    logMessage(prompt.id, `[${i + 1}/${prompts.length}] Tiếp tục trong cùng dự án...`, 'processing');
                    // Wait a bit for previous video to finish downloading
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Check stop flag after waiting
                if (stopFlowAutomation) {
                    logMessage(prompt.id, '🛑 Đã nhận lệnh dừng - bỏ qua prompt này', 'error');
                    continue;
                }

                // STEP 3: Configure video settings FIRST (before entering prompt)
                if (videoConfig) {
                    logMessage(prompt.id, 'Đang cấu hình video trước khi submit...', 'processing');

                    // 4.1: Click settings button (tune icon) to open configuration menu
                    try {
                        logMessage(prompt.id, 'Đang click vào nút cài đặt (tune icon)...', 'processing');
                        await page.evaluate(() => {
                            // Find settings button with tune icon
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const settingsButton = buttons.find(btn => {
                                const icon = btn.querySelector('i.material-icons-outlined');
                                return icon && icon.textContent === 'tune';
                            });
                            if (settingsButton) {
                                settingsButton.click();
                                console.log('[Veo3] Clicked settings button with tune icon');
                                return true;
                            }
                            return false;
                        });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        console.log(`[Veo3] ⚠ Không thể click settings button: ${err.message}`);
                    }

                    // 4.2: Select aspect ratio (ALWAYS click, even for default 16:9)
                    try {
                        logMessage(prompt.id, `Đang chọn tỷ lệ khung hình ${videoConfig?.aspectRatio || '16:9'}...`, 'processing');
                        await page.evaluate((aspectRatio) => {
                            // Find aspect ratio dropdown with specific selectors
                            const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
                            const aspectButton = buttons.find(btn => {
                                const span = btn.querySelector('span');
                                return span && span.textContent.includes('Tỷ lệ khung hình');
                            });
                            if (aspectButton) {
                                aspectButton.click();
                                setTimeout(() => {
                                    // Find target aspect ratio option
                                    const options = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"]'));
                                    let targetOption;

                                    if (aspectRatio === '9:16') {
                                        targetOption = options.find(opt =>
                                            opt.textContent.includes('9:16') || opt.textContent.includes('Khổ dọc')
                                        );
                                    } else {
                                        // Default to 16:9 (Khổ ngang)
                                        targetOption = options.find(opt =>
                                            opt.textContent.includes('16:9') || opt.textContent.includes('Khổ ngang')
                                        );
                                    }

                                    if (targetOption) {
                                        targetOption.click();
                                        console.log(`[Veo3] Selected aspect ratio: ${aspectRatio || '16:9'}`);
                                    }
                                }, 500);
                            }
                        }, videoConfig?.aspectRatio || '16:9');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    } catch (err) {
                        console.log(`[Veo3] ⚠ Không thể chọn aspect ratio: ${err.message}`);
                    }

                    // 4.3: Select output count (ALWAYS click, even for default 1)
                    try {
                        logMessage(prompt.id, `Đang chọn số lượng ${videoConfig?.outputCount || 1} video...`, 'processing');
                        await page.evaluate((count) => {
                            // Find output count dropdown with specific selectors
                            const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
                            const countButton = buttons.find(btn => {
                                const span = btn.querySelector('span');
                                return span && span.textContent.includes('Câu trả lời đầu ra cho mỗi câu lệnh');
                            });
                            if (countButton) {
                                countButton.click();
                                setTimeout(() => {
                                    // Find target count option
                                    const options = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"]'));
                                    const targetOption = options.find(opt =>
                                        opt.textContent.includes(count.toString())
                                    );
                                    if (targetOption) {
                                        targetOption.click();
                                        console.log(`[Veo3] Selected output count: ${count}`);
                                    }
                                }, 500);
                            }
                        }, videoConfig?.outputCount || 1);
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    } catch (err) {
                        console.log(`[Veo3] ⚠ Không thể chọn output count: ${err.message}`);
                    }

                    // 4.4: Select model (ALWAYS click, even for default veo3-fast)
                    try {
                        logMessage(prompt.id, `Đang chọn mô hình ${videoConfig?.model || 'veo3-fast'}...`, 'processing');
                        await page.evaluate((model) => {
                            // Model mapping
                            const modelMap = {
                                'veo3-fast': 'Veo 3.1 - Fast',
                                'veo3-quality': 'Veo 3 - Quality',
                                'veo2-fast': 'Veo 2 - Fast',
                                'veo2-quality': 'Veo 2 - Quality'
                            };
                            const targetModelText = modelMap[model] || 'Veo 3.1 - Fast';

                            // Find model dropdown with specific selectors
                            const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
                            const modelButton = buttons.find(btn => {
                                const span = btn.querySelector('span');
                                return span && span.textContent.includes('Mô hình');
                            });
                            if (modelButton) {
                                modelButton.click();
                                setTimeout(() => {
                                    // Find target model option
                                    const options = Array.from(document.querySelectorAll('[role="option"], [role="menuitem"]'));
                                    const targetOption = options.find(opt =>
                                        opt.textContent.includes(targetModelText)
                                    );
                                    if (targetOption) {
                                        targetOption.click();
                                        console.log(`[Veo3] Selected model: ${targetModelText}`);
                                    }
                                }, 500);
                            }
                        }, videoConfig?.model || 'veo3-fast');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    } catch (err) {
                        console.log(`[Veo3] ⚠ Không thể chọn model: ${err.message}`);
                    }
                }



                //Lặp lại ở bước này

                // STEP 4: Wait and fill textarea AFTER configuration (and after selecting frames mode if any)
                logMessage(prompt.id, 'Đang tìm textarea để nhập prompt...', 'processing');
                await page.waitForSelector(textareaSelector, { visible: true, timeout: 30000 });

                // Clear textarea completely
                await page.click(textareaSelector, { clickCount: 3 });
                await page.keyboard.press('Backspace');
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for clear

                // Type prompt character by character (NO PASTE)
                // IMPORTANT: Replace all newlines with spaces to prevent accidental submit
                const promptTextSingleLine = prompt.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                logMessage(prompt.id, `Đang typing prompt (${promptTextSingleLine.length} ký tự)...`, 'processing');
                console.log(`[Veo3] Starting to type ${promptTextSingleLine.length} characters...`);
                console.log(`[Veo3] Original length: ${prompt.text.length}, Single-line length: ${promptTextSingleLine.length}`);

                // Type with delay between characters to simulate human typing
                const typingDelay = 10; // 10ms per character
                await page.type(textareaSelector, promptTextSingleLine, { delay: typingDelay });

                // Wait for typing to complete
                const expectedTypingTime = promptTextSingleLine.length * typingDelay;
                console.log(`[Veo3] Expected typing time: ${expectedTypingTime}ms`);
                await new Promise(resolve => setTimeout(resolve, Math.max(1000, expectedTypingTime / 10)));

                // Verify content was typed completely - CRITICAL CHECK
                logMessage(prompt.id, 'Đang kiểm tra nội dung đã nhập đầy đủ...', 'processing');

                let verificationAttempts = 0;
                let typedContent = '';
                const maxVerificationAttempts = 5;

                while (verificationAttempts < maxVerificationAttempts) {
                    typedContent = await page.evaluate((selector) => {
                        const textarea = document.querySelector(selector);
                        return textarea ? textarea.value : '';
                    }, textareaSelector);

                    console.log(`[Veo3] Verification attempt ${verificationAttempts + 1}:`);
                    console.log(`[Veo3] - Expected length: ${promptTextSingleLine.length}`);
                    console.log(`[Veo3] - Actual length: ${typedContent.length}`);
                    console.log(`[Veo3] - Match percentage: ${(typedContent.length / promptTextSingleLine.length * 100).toFixed(2)}%`);

                    // Check if content matches (allow 95% match to account for minor differences)
                    if (typedContent.length >= promptTextSingleLine.length * 0.95) {
                        console.log(`[Veo3] ✓ Content verification PASSED`);
                        break;
                    }

                    console.log(`[Veo3] ⚠ Content incomplete, waiting 1 second...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    verificationAttempts++;
                }

                // Final strict verification before submit
                if (typedContent.length < promptTextSingleLine.length * 0.95) {
                    const errorMsg = `Content verification FAILED! Expected ${promptTextSingleLine.length} chars, got ${typedContent.length} chars (${(typedContent.length / promptTextSingleLine.length * 100).toFixed(2)}%)`;
                    console.error(`[Veo3] ❌ ${errorMsg}`);
                    throw new Error(errorMsg);
                }

                if (!typedContent || typedContent.length < 50) {
                    throw new Error(`Textarea content is too short (${typedContent.length} chars). Minimum required: 50 chars`);
                }

                console.log(`[Veo3] ✓ Final content verified: ${typedContent.length}/${promptTextSingleLine.length} characters (${(typedContent.length / promptTextSingleLine.length * 100).toFixed(2)}%)`);
                logMessage(prompt.id, `✓ Đã nhập đầy đủ ${typedContent.length} ký tự`, 'processing');

                // STEP 5: Capture ALL existing media URLs BEFORE submit (to ensure we wait for a truly NEW one)
                const existingMediaUrls = await page.evaluate(() => {
                    const urls = new Set();
                    // Collect existing video sources
                    document.querySelectorAll('video[controlslist="nodownload"]').forEach(v => {
                        if (v.src && !v.src.startsWith('data:')) urls.add(v.src);
                    });
                    // Collect any direct download/storage links
                    document.querySelectorAll('a[href*="storage.googleapis.com"]').forEach(a => {
                        if (a.href) urls.add(a.href);
                    });
                    return Array.from(urls);
                }).catch(() => []);

                console.log('[Veo3] Existing media URLs before submit:', existingMediaUrls);

                // STEP 5b: Submit after configuration (and frame upload if applicable)
                logMessage(prompt.id, 'Đang submit prompt...', 'processing');
                await page.keyboard.press('Enter');

                // Wait for video generation (NO TIMEOUT - wait until video appears or user stops)
                logMessage(prompt.id, 'Đang chờ video được tạo (chờ đến khi có video)...', 'processing');

                // Monitor progress with periodic updates
                let progressCheckInterval;
                let videoGenerated = false;
                const videoGenStartTime = Date.now();

                // Start progress monitoring
                progressCheckInterval = setInterval(async () => {
                    if (videoGenerated || stopFlowAutomation) return;

                    try {
                        const progressInfo = await page.evaluate(() => {
                            // Check for progress indicators
                            const progressElements = document.querySelectorAll('[data-testid*="progress"], .progress, [class*="progress"]');
                            const statusElements = document.querySelectorAll('[class*="status"], [class*="loading"]');

                            let progressText = '';
                            let statusText = '';

                            // Get progress text
                            progressElements.forEach(el => {
                                const text = el.textContent?.trim();
                                if (text && text.length > 0 && text.length < 100) {
                                    progressText = text;
                                }
                            });

                            // Get status text
                            statusElements.forEach(el => {
                                const text = el.textContent?.trim();
                                if (text && text.length > 0 && text.length < 100) {
                                    statusText = text;
                                }
                            });

                            return {
                                progressText: progressText || 'Đang xử lý...',
                                statusText: statusText || 'Đang tạo video',
                                hasVideo: !!document.querySelector('video[controlslist="nodownload"]')
                            };
                        });

                        // Log elapsed time every minute
                        const elapsedMinutes = Math.floor((Date.now() - videoGenStartTime) / 60000);
                        const statusMsg = `${progressInfo.progressText} - ${progressInfo.statusText} (${elapsedMinutes} phút)`;

                        if (progressInfo.hasVideo) {
                            videoGenerated = true;
                            clearInterval(progressCheckInterval);
                        } else {
                            // Send progress update
                            logMessage(prompt.id, statusMsg, 'processing');
                        }
                    } catch (err) {
                        // Ignore progress check errors
                    }
                }, 10000); // Check every 10 seconds

                // Wait for video indefinitely (poll every 2s until video appears or user stops)
                while (!stopFlowAutomation) {
                    const hasNewVideo = await page.evaluate((oldUrls) => {
                        const video = document.querySelector('video[controlslist="nodownload"]');
                        if (!video || !video.src || video.src.startsWith('data:')) return false;

                        // Check if it's a storage URL
                        if (!video.src.includes('storage.googleapis.com')) return false;

                        // Ensure the new URL is NOT among any previously seen URLs
                        const previouslySeen = Array.isArray(oldUrls) ? new Set(oldUrls) : new Set();
                        if (previouslySeen.has(video.src)) return false;

                        console.log('[Veo3] NEW video detected!', video.src);
                        return true;
                    }, existingMediaUrls).catch(() => false);

                    if (hasNewVideo) {
                        videoGenerated = true;
                        break; // Video found, exit wait loop
                    }

                    // Wait 2s before next check
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Clear interval when done
                if (progressCheckInterval) {
                    clearInterval(progressCheckInterval);
                }

                // If stopped while waiting for video
                if (stopFlowAutomation) {
                    logMessage(prompt.id, '🛑 Đã dừng trong khi chờ video được tạo', 'error');
                    throw new Error('Stopped by user');
                }

                // Extract video URL
                const videoUrl = await page.evaluate(() => {
                    const link = document.querySelector('a[href*="storage.googleapis.com"]');
                    if (link && link.href) return link.href;

                    const video = document.querySelector('video[controlslist="nodownload"]');
                    if (video && video.src && !video.src.startsWith('data:')) return video.src;

                    return null;
                });

                if (!videoUrl || videoUrl.startsWith('data:')) {
                    throw new Error('Không tìm thấy URL video hợp lệ');
                }

                // Verify it's a NEW video
                console.log('[Veo3] Previously seen media URLs:', existingMediaUrls);
                console.log('[Veo3] New video URL:', videoUrl);
                if (existingMediaUrls && existingMediaUrls.includes(videoUrl)) {
                    console.warn('[Veo3] ⚠️ WARNING: New video URL is among previously seen URLs!');
                }

                logMessage(prompt.id, 'Đã tạo video thành công!', 'success', videoUrl);
                processedCount++;

                // Auto download if enabled - CRITICAL: Must complete before next scene starts
                console.log(`[Veo3] Auto-save config:`, {
                    enabled: autoSaveConfig.enabled,
                    hasPath: !!autoSaveConfig.path,
                    originalIndex: prompt.originalIndex,
                    indexType: typeof prompt.originalIndex
                });

                // FIXED: Accept both number and string (for sub-scenes like "1.1")
                if (autoSaveConfig.enabled && autoSaveConfig.path && prompt.originalIndex != null) {
                    const downloadResult = await downloadVideoFromUrl(videoUrl, prompt.text, autoSaveConfig.path, prompt.originalIndex);

                    if (!downloadResult.success) {
                        logMessage(prompt.id, `Lỗi khi lưu: ${downloadResult.error}`, 'error', videoUrl);
                    } else {
                        // Send success with LOCAL video path for UI to display (not overwrite previous success)
                        // UI will use this local path to show video player
                        logMessage(prompt.id, `✅ Đã lưu tại: ${downloadResult.path}`, 'success', downloadResult.path);

                        // CRITICAL: Wait for frame extraction to complete before proceeding
                        // Frontend will auto-capture frame after receiving success log
                        // Wait 3 seconds to ensure frame capture completes (frontend has 500ms delay + processing time)
                        console.log(`[Veo3] Waiting 3s for frame extraction...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        // Verify frame was saved
                        const frameDir = autoSaveConfig.path;
                        const sceneIndex = prompt.originalIndex;
                        const frameFiles = fs.readdirSync(frameDir)
                            .filter(name => name.toLowerCase().endsWith('.jpg'))
                            .filter(name => name.includes(`frame_scene_scene-${sceneIndex}_`));

                        if (frameFiles.length > 0) {
                            const latestFrame = frameFiles
                                .map(name => ({ name, mtime: fs.statSync(path.join(frameDir, name)).mtime.getTime() }))
                                .sort((a, b) => b.mtime - a.mtime)[0];
                            const framePath = path.join(frameDir, latestFrame.name);
                            console.log(`[Veo3] ✅ Frame saved: ${path.basename(framePath)}`);
                            // Don't send log to avoid overwriting UI status
                        } else {
                            console.log(`[Veo3] ⚠️ Frame not detected yet (next scene will wait)`);
                            // Don't send log to avoid overwriting UI status
                        }
                    }
                }

                // Reload page for next scene
                console.log(`[Veo3] Reloading page for next scene...`);
                await page.reload({ waitUntil: 'networkidle0' });
                // Wait for UI to stabilize
                await new Promise(resolve => setTimeout(resolve, 5000));

                // Small delay between prompts (scene tiếp theo sẽ tự động chờ nếu cần frame)
                if (i < prompts.length - 1 && !stopFlowAutomation) {
                    logMessage(null, `✅ Scene ${prompt.originalIndex} hoàn thành. Chuẩn bị scene tiếp theo...`, 'running');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                logMessage(prompt.id, `Lỗi: ${error.message}`, 'error');
                console.error(`Veo3 automation error for prompt ${prompt.id}:`, error);
            }
        }

        await browser.close();
        logMessage(null, `===== Hoàn thành! Đã xử lý ${processedCount}/${prompts.length} video =====`, 'success');

        return {
            success: true,
            processed: processedCount,
            total: prompts.length
        };

    } catch (error) {
        logMessage(null, `Lỗi nghiêm trọng: ${error.message}`, 'error');
        console.error('Veo3 automation fatal error:', error);

        dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Lỗi Veo3 Automation',
            message: error.message,
            detail: error.stack
        });

        return {
            success: false,
            error: error.message
        };
    }
});

// Test Veo3 Account - Open browser with cookies (for debugging)
ipcMain.handle('test-veo3-account', async (event, { cookieString, accountName }) => {
    const puppeteer = require('puppeteer-core');

    try {
        console.log(`[Test Account] =====================================`);
        console.log(`[Test Account] TESTING: ${accountName}`);
        console.log(`[Test Account] =====================================`);

        // Parse cookies - USE SAME LOGIC AS VALIDATION
        const cookies = [];
        const trimmedString = cookieString.trim();

        // Check format: semicolon = document.cookie, tab = DevTools TSV
        if (trimmedString.includes(';') && !trimmedString.includes('\t')) {
            // Format 1: document.cookie format (name=value; name2=value2)
            console.log('[Test Account] Detected document.cookie format');
            const pairs = trimmedString.split(';');

            for (const pair of pairs) {
                const [name, ...valueParts] = pair.trim().split('=');
                if (name && valueParts.length > 0) {
                    const value = valueParts.join('=');
                    const trimmedName = name.trim();

                    // Determine domain based on cookie name
                    let domain = '.google.com';
                    if (trimmedName.includes('next-auth') || trimmedName === 'EMAIL' || trimmedName.startsWith('_ga')) {
                        domain = 'labs.google';
                    }

                    cookies.push({
                        name: trimmedName,
                        value: value.trim(),
                        domain: domain,
                        path: '/',
                        secure: true,
                        httpOnly: false,
                        sameSite: 'Lax'
                    });
                }
            }
        } else {
            // Format 2: DevTools TSV format
            console.log('[Test Account] Detected DevTools TSV format');
            const lines = trimmedString.split('\n');

            for (const line of lines) {
                const parts = line.trim().split('\t');
                if (parts.length >= 7) {
                    const cookie = {
                        name: parts[5],
                        value: parts[6],
                        domain: parts[0],
                        path: parts[2],
                        secure: parts[3] === 'TRUE' || parts[3] === '✓',
                        httpOnly: parts[4] === 'TRUE' || parts[4] === '✓',
                        sameSite: 'None'
                    };

                    if (parts[1] && parts[1] !== '0') {
                        cookie.expires = parseInt(parts[1]);
                    }

                    cookies.push(cookie);
                }
            }
        }

        console.log(`[Test Account] Parsed ${cookies.length} cookies`);

        if (cookies.length === 0) {
            return {
                success: false,
                error: 'Không tìm thấy cookie hợp lệ!'
            };
        }

        // Launch browser (SAME AS VALIDATION)
        const browser = await puppeteer.launch({
            headless: false,
            executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized'
            ],
            ignoreDefaultArgs: ['--enable-automation'],
            defaultViewport: null
        });

        const page = await browser.newPage();

        // Set cookies BEFORE navigation (SAME AS VALIDATION)
        console.log('[Test Account] Setting cookies...');
        let setCookieCount = 0;

        for (const cookie of cookies) {
            try {
                await page.setCookie(cookie);
                setCookieCount++;
                console.log(`[Test Account] ✓ Set cookie: ${cookie.name}`);
            } catch (err) {
                console.log(`[Test Account] ✗ Failed to set cookie ${cookie.name}: ${err.message}`);
            }
        }

        console.log(`[Test Account] Set ${setCookieCount}/${cookies.length} cookies successfully`);

        // Navigate to Flow (SAME AS VALIDATION)
        console.log('[Test Account] Navigating to Flow...');
        await page.goto('https://labs.google/fx/vi/tools/flow', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('[Test Account] ✅ Page loaded successfully!');
        console.log('[Test Account] Browser will stay open - check login status manually');
        console.log('[Test Account] Close browser when done');

        // Don't close browser - let user inspect manually

        return {
            success: true,
            message: `Browser đã mở với ${setCookieCount}/${cookies.length} cookies. Kiểm tra trạng thái đăng nhập!`
        };

    } catch (error) {
        console.error('[Test Account] Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
