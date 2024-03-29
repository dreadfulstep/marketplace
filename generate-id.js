function generateID(blueprint = null) {

    if (typeof blueprint !== 'string') throw new TypeError(`Invalid blueprint provided - Must be a string but received ${typeof blueprint}`);
    if (blueprint.length === 0) throw new TypeError(`Invalid blueprint provided - Must be a non-empty string`);

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{};:,./<>?';

    let string = '';
    for (let i = 0; i < blueprint.length; i++) {
        const char = blueprint[i];
        const prev = blueprint[i - 1] ?? '';

        if (prev === '\\' && char !== '\\') {
            string = string.slice(0, -1) + char;
            continue;
        }

        switch (char) {
            case 'L':
                string += RandomElement(letters);
                break;
            case 'N':
                string += RandomElement(numbers);
                break;
            case 'S':
                string += RandomElement(symbols);
                break;
            case 'A':
                string += RandomElement([ ...letters, ...numbers ]);
                break;
            case 'X':
                string += RandomElement([ ...letters, ...numbers, ...symbols ]);
                break;
            default:
                string += char;
                break;
        }
    }

    return string;
}

function RandomElement(array = [ null ]) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = generateID;