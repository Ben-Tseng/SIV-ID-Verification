(function () {
	let type = window.__validatorArgs?.[0] || '';
	let input = window.__validatorArgs?.[1] || '';
	let autoCheck = window.__validatorArgs?.[2] || false;
	try { delete window.__validatorArgs; } catch (e) {}

	// Validation functions
	function validateHKID(v) {
    // 完整 HKID 必须是 8 位字符串（不含括号）
    if (typeof v !== 'string' || v.length !== 8) return false;

    // 如果前两位都是字母，则此规则不适用
    if (/^[A-Z]{2}[0-9]{6}[0-9]$/.test(v)) {  // 注意校验位这里只能是数字 0-9（无 A）
        return false;
    }

    // 基本格式校验：单字母 + 6数字 + 1数字校验位
    if (!/^[A-Z][0-9]{7}$/.test(v)) return false;

    const weights = [8, 7, 6, 5, 4, 3, 2];  // 新权重
    let sum = (v.charCodeAt(0) - 64) * weights[0];  // A=1, ..., Z=26

    for (let i = 1; i < 7; i++) {
        sum += Number(v[i]) * weights[i];
    }

    const remainder = sum % 11;
    let expectedCheck;

    if (remainder === 0) {
        expectedCheck = '0';
    } else if (remainder === 10) {
        expectedCheck = 'A';
    } else {
        expectedCheck = String(11 - remainder);
    }

    return expectedCheck === v[7];
}

function computeHKIDCheck(prefix7) {
    // prefix7: 字母 + 6 数字，共 7 位
    if (typeof prefix7 !== 'string' || prefix7.length !== 7) return null;

    // 如果前两位都是字母，则此规则不适用
    if (/^[A-Z]{2}[0-9]{6}$/.test(prefix7)) {
        return null;
    }

    // 格式校验
    if (!/^[A-Z][0-9]{6}$/.test(prefix7)) return null;

    const weights = [8, 7, 6, 5, 4, 3, 2];
    let sum = (prefix7.charCodeAt(0) - 64) * weights[0];

    for (let i = 1; i < 7; i++) {
        sum += Number(prefix7[i]) * weights[i];
    }

    const remainder = sum % 11;
    let checkDigit;

    if (remainder === 0) {
        checkDigit = '0';
    } else if (remainder === 1) {
        checkDigit = 'A';
    } else {
        checkDigit = String(11 - remainder);
    }

    return checkDigit;
}

	function emphasizeDigitsHTML(s) {
		if (!s) return '';
		const sanitized = String(s).replace(/[<>&"']/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
		return sanitized.replace(/(\d+)/g, '<span style="font-weight:700; font-size:1.4em;">$1</span>');
	}

	function emphasizeDigitsHTMLUnderlined(s) {
		if (!s) return '';
		const sanitized = String(s).replace(/[<>&"']/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
		return sanitized.replace(/(\d+)/g, '<span style="font-weight:700; font-size:1.4em; text-decoration: underline;">$1</span>');
	}

	function validateTWID(v) {
		if (!/^[A-Z][12][0-9]{8}$/.test(v)) return false;
		const map = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
		const i = map.indexOf(v[0]) + 10;
		const nums = [Math.floor(i / 10), i % 10, ...v.slice(1).split('').map(Number)];
		const w = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
		const sum = nums.reduce((s, n, idx) => s + n * w[idx], 0);
		return sum % 10 === 0;
	}

	function setResult(status, title, message) {
		// MRZ and HKID: emphasize digits and underline, white background
		if (type === 'mrz' || type === 'hkid') {
			const content = message || title || '';
			// Don't emphasize digits in error messages containing "need"
			if (/need\s+\d+/i.test(content)) {
				resultDiv.textContent = content;
			} else {
				resultDiv.innerHTML = emphasizeDigitsHTMLUnderlined(content);
			}
			resultDiv.style.background = 'white';
			resultDiv.style.color = 'black';
			return;
		}

		// TWID: emphasize digits (larger & bold, no underline)
		if (type === 'twid') {
			const content = message || title || '';
			// If message contains pattern like "expect A123456789", do not emphasize digits
			if (/expect\s+A\d+/i.test(content)) {
				resultDiv.textContent = content;
			} else {
				resultDiv.innerHTML = emphasizeDigitsHTML(content);
			}
			if (status === 'calc') {
				resultDiv.style.background = 'white';
				resultDiv.style.color = 'black';
			} else if (status === 'valid') {
				resultDiv.style.background = '#d4fc79';
				resultDiv.style.color = 'black';
			} else if (status === 'invalid') {
				resultDiv.style.background = '#fecaca';
				resultDiv.style.color = 'black';
			} else {
				resultDiv.style.background = '#f7fafc';
				resultDiv.style.color = 'black';
			}
			return;
		}

		// Default behavior
		const sanitizedTitle = String(title || '').replace(/[<>&"']/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
		const sanitizedMessage = String(message || '').replace(/[<>&"']/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
		resultDiv.innerHTML = `<strong>${sanitizedTitle}</strong><br><small>${sanitizedMessage}</small>`;
		if (status === 'valid') {
			resultDiv.style.background = '#d4fc79';
		} else if (status === 'invalid') {
			resultDiv.style.background = '#fecaca';
		} else if (status === 'calc') {
			resultDiv.style.background = '#bfdbfe';
		} else {
			resultDiv.style.background = '#f7fafc';
		}
	}

	function checkPassport() {
		const raw = inputField.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
		const length = raw.length;
		
		if (length < 1) {
			setResult('waiting', 'Enter Passport Number', '');
			return;
		}
		
		if (length < 6 || length > 10) {
			setResult('invalid', 'Invalid: must be 6-10 characters', '');
			return;
		}
		
		const weights = [7, 3, 1];
		let sum = 0;
		
		// Calculate check digit
		for (let i = 0; i < length; i++) {
			const char = raw.charAt(i);
			let value;
			
			if (char >= '0' && char <= '9') {
				value = parseInt(char, 10);
			} else if (char >= 'A' && char <= 'Z') {
				value = (char.charCodeAt(0) - 65) % 10; // A=0, B=1, ..., J=9, K=0, L=1, ..., Z=5
			} else {
				setResult('invalid', 'Invalid character', '');
				return;
			}
			
			sum += value * weights[i % 3];
		}
		
		const checkDigit = (sum % 10).toString();
		const sanitizedCheckDigit = String(checkDigit).replace(/[<>&"']/g, (m) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
		setResult('calc', 'Check Digit', `Check Digit:\t${sanitizedCheckDigit}`);
	}

	// Create popup window
	const popup = document.createElement('div');
	popup.id = '__validator_popup';
	popup.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		padding: 30px;
		width: 90%;
		max-width: 400px;
		z-index: 999999;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
	`;

	const backdrop = document.createElement('div');
	backdrop.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999998;
	`;

	const title = document.createElement('h2');
	title.style.cssText = 'margin-bottom: 20px; color: #2d3748; font-size: 20px; text-align: center;';

	const inputLabel = document.createElement('label');
	inputLabel.textContent = 'Enter or paste ' + (type === 'hkid' ? 'HKID' : type === 'twid' ? 'TW ID' : 'MRZ') + ':';
	inputLabel.style.cssText = 'display: block; color: #4a5568; font-weight: 600; margin-bottom: 10px; font-size: 14px;';

	const inputField = document.createElement('input');
	inputField.type = 'text';
	inputField.value = input.toUpperCase().replace(/\s+/g, '');
	inputField.placeholder = 'Paste or type ' + (type === 'hkid' ? 'HKID' : type === 'twid' ? 'TW ID' : 'MRZ');
	const inputStyle = type === 'mrz' ? 'color: black;' : '';
	inputField.style.cssText = `
		width: 100%;
		padding: 12px;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		font-size: 16px;
		margin-bottom: 15px;
		box-sizing: border-box;
		text-transform: uppercase;
		${inputStyle}
	`;

	const resultDiv = document.createElement('div');
	resultDiv.style.cssText = `
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 20px;
		text-align: center;
		font-weight: 500;
		min-height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		white-space: pre;
	`;
	resultDiv.textContent = 'Ready to validate';
	resultDiv.style.background = '#f7fafc';

	const buttonContainer = document.createElement('div');
	buttonContainer.style.cssText = 'display: flex; gap: 10px;';

	const checkBtn = document.createElement('button');
	checkBtn.textContent = 'Check';
	checkBtn.style.cssText = `
		flex: 1;
		padding: 12px;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: transform 0.2s;
	`;

	const closeBtn = document.createElement('button');
	closeBtn.textContent = 'Close';
	closeBtn.style.cssText = `
		flex: 1;
		padding: 12px;
		background: #f7fafc;
		color: #4a5568;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		transition: transform 0.2s;
	`;

	function validate() {
		const val = inputField.value.toUpperCase().replace(/\s+/g, '');
		if (!val) {
			resultDiv.textContent = 'Please enter a value';
			resultDiv.style.background = '#fecaca';
			return;
		}

		let isValid = false;
		if (type === 'hkid') {
			// Auto-check mode: generate check digit from first 7 chars
			if (autoCheck) {
				const prefix = val.replace(/[^A-Z0-9]/g, '').slice(0, 7);
				if (prefix.length < 7) {
					setResult('invalid', 'Invalid: need 7 chars', '');
					return;
				}
				const check = computeHKIDCheck(prefix);
				if (check === null) {
					setResult('invalid', 'Invalid: format', '');
				} else {
					setResult('calc', 'Check Digit', `Check Digit:\t${check}`);
				}
				return;
			}
			// Manual mode: full validation
			if (!/^[A-Z][0-9]{6}[0-9A]$/.test(val)) {
				setResult('invalid', '❌ Invalid format (expect A1234567X)', '');
			} else {
				isValid = validateHKID(val);
				if (isValid) {
				setResult('valid', '✅ VALID HK ID', `HK ID:\t${val}`);
			} else {
				setResult('invalid', '❌ INVALID HK ID', `HK ID:\t${val}`);
				}
			}
		} else if (type === 'twid') {
			if (!/^[A-Z][12][0-9]{8}$/.test(val)) {
				setResult('invalid', '❌ Invalid format (expect A123456789)', '');
			} else {
				isValid = validateTWID(val);
				if (isValid) {
					setResult('valid', '✅ VALID TW ID');
				} else {
					setResult('invalid', '❌ INVALID TW ID');
				}
			}
		} else if (type === 'mrz') {
			checkPassport();
		}
	}

	checkBtn.addEventListener('click', validate);
	inputField.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') validate();
		if (e.key === 'Escape') close();
	});

	closeBtn.addEventListener('click', () => {
		popup.remove();
		backdrop.remove();
	});

	function close() {
		popup.remove();
		backdrop.remove();
	}

	checkBtn.addEventListener('mousedown', function() { this.style.transform = 'translateY(-2px)'; });
	checkBtn.addEventListener('mouseup', function() { this.style.transform = ''; });
	closeBtn.addEventListener('mousedown', function() { this.style.transform = 'translateY(-2px)'; });
	closeBtn.addEventListener('mouseup', function() { this.style.transform = ''; });

	// Set title based on type
	if (type === 'hkid') {
		title.textContent = autoCheck ? 'HK ID Check Digit Calculator' : 'HK ID Validator';
	} else if (type === 'twid') {
		title.textContent = 'Taiwan ID Validator';
	} else if (type === 'mrz') {
		title.textContent = 'Passport Check Digit Calculator';
	} else {
		title.textContent = 'ID Validator';
	}

	// Assemble popup
	popup.appendChild(title);
	popup.appendChild(inputLabel);
	popup.appendChild(inputField);
	popup.appendChild(resultDiv);
	buttonContainer.appendChild(checkBtn);
	buttonContainer.appendChild(closeBtn);
	popup.appendChild(buttonContainer);

	// Add to page
	document.body.appendChild(backdrop);
	document.body.appendChild(popup);

	// Focus input and auto-validate if input provided
	inputField.focus();
	if (input) {
		validate();
	}
})();