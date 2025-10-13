# 📐 Hướng dẫn sử dụng Công thức Toán học trong Phân tích

## ✅ Đã hỗ trợ KaTeX Math Rendering

Ứng dụng giờ đã hỗ trợ hiển thị công thức toán học đẹp mắt với **KaTeX**.

---

## 📝 Cú pháp LaTeX trong Markdown

### 1. **Inline Math (Toán trong dòng)**

Dùng ký hiệu `$...$`:

```markdown
Định lý Pythagoras: $a^2 + b^2 = c^2$
```

**Kết quả:** Định lý Pythagoras: $a^2 + b^2 = c^2$

---

### 2. **Display Math (Toán riêng dòng)**

Dùng ký hiệu `$$...$$`:

```markdown
Công thức tích phân:

$$\int_{a}^{b} f(x) \, dx = F(b) - F(a)$$
```

**Kết quả:**

$$\int_{a}^{b} f(x) \, dx = F(b) - F(a)$$

---

## 🔢 Ví dụ Công thức phổ biến

### Phân số
```latex
$\frac{a}{b}$ hoặc $\frac{numerator}{denominator}$
```
→ $\frac{a}{b}$

### Căn bậc hai
```latex
$\sqrt{x}$ hoặc $\sqrt[n]{x}$
```
→ $\sqrt{x}$ hoặc $\sqrt[n]{x}$

### Lũy thừa và chỉ số dưới
```latex
$x^2$ hoặc $x_i$ hoặc $x^{2n+1}$
```
→ $x^2$, $x_i$, $x^{2n+1}$

### Tổng và tích
```latex
$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$
```
→ $$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

```latex
$$\prod_{i=1}^{n} i = n!$$
```
→ $$\prod_{i=1}^{n} i = n!$$

### Giới hạn
```latex
$$\lim_{x \to \infty} \frac{1}{x} = 0$$
```
→ $$\lim_{x \to \infty} \frac{1}{x} = 0$$

### Ma trận
```latex
$$\begin{pmatrix} 
a & b \\ 
c & d 
\end{pmatrix}$$
```
→ Ma trận 2x2

### Hệ phương trình
```latex
$$\begin{cases}
x + y = 5 \\
2x - y = 1
\end{cases}$$
```

---

## 🎯 AI sẽ tự động format

Khi AI phân tích nội dung toán học, nó sẽ tự động sử dụng cú pháp LaTeX:

**Ví dụ phân tích AI:**

```markdown
## 3. Khái niệm & Công thức

**Định lý Pythagoras:** 
Trong tam giác vuông, ta có: $a^2 + b^2 = c^2$

Trong đó:
- $a, b$: cạnh góc vuông
- $c$: cạnh huyền

**Ví dụ áp dụng:**
Cho tam giác vuông có $a = 3$, $b = 4$, tính $c$:

$$c = \sqrt{a^2 + b^2} = \sqrt{3^2 + 4^2} = \sqrt{25} = 5$$
```

---

## 🚀 Các ký hiệu đặc biệt

| Ký hiệu | LaTeX | Hiển thị |
|---------|-------|----------|
| Alpha | `\alpha` | α |
| Beta | `\beta` | β |
| Pi | `\pi` | π |
| Sigma | `\sigma` | σ |
| Infinity | `\infty` | ∞ |
| Approximately | `\approx` | ≈ |
| Less than or equal | `\leq` | ≤ |
| Greater than or equal | `\geq` | ≥ |
| Not equal | `\neq` | ≠ |
| Belongs to | `\in` | ∈ |
| Arrow | `\rightarrow` | → |

---

## 💡 Tips

1. **Inline math** (`$...$`): Dùng cho công thức ngắn trong câu
2. **Display math** (`$$...$$`): Dùng cho công thức quan trọng, độc lập
3. **Spacing**: KaTeX tự động format khoảng cách đẹp
4. **Preview**: Xem trong modal để thấy công thức render đầy đủ

---

## 📚 Tham khảo

- [KaTeX Documentation](https://katex.org/docs/supported.html)
- [LaTeX Math Symbols](https://www.caam.rice.edu/~heinken/latex/symbols.pdf)

---

**Bây giờ phân tích nội dung toán học của bạn sẽ đẹp và chuyên nghiệp hơn!** 🎓✨
