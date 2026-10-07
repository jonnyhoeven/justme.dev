// SPDX-FileCopyrightText: Jonny van der Hoeven
// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * IBM PC code page 437, the character set tracker authors typed instrument and
 * song names in. Bytes 0x80-0xFF map to accented letters, box drawing and the
 * block shades used for ASCII-art credits; plain ASCII is left alone.
 */
const CP437_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒ' +
  'áíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐' +
  '└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀' +
  'αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

/** Decode one name byte; control codes and NULs become spaces. */
export function decodeCp437Byte(byte: number): string {
  if (byte >= 0x80) return CP437_HIGH[byte - 0x80];
  if (byte < 0x20) return ' ';
  return String.fromCharCode(byte);
}
