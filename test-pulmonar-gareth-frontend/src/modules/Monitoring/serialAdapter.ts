// src/lib/serialAdapter.ts
import type { SerialPort } from "./serial.interface";

export type LineReader = ReadableStreamDefaultReader<string>;
export type LineWriter = WritableStreamDefaultWriter<string>; // << string writer

export interface SerialIO {
  reader: LineReader;
  writer: LineWriter;
  close: () => Promise<void>;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export async function getAuthorizedPorts(): Promise<SerialPort[]> {
  if (!isWebSerialSupported()) return [];
  return navigator.serial.getPorts();
}

export async function requestPort(
  filters?: Array<{ usbVendorId?: number; usbProductId?: number }>,
): Promise<SerialPort> {
  if (!isWebSerialSupported()) {
    throw new Error("Web Serial no está disponible. Use Chrome/Edge en HTTPS.");
  }
  return navigator.serial.requestPort(filters ? { filters } : undefined);
}

/**
 * Abre el puerto y devuelve IO por líneas (reader) + writer de string.
 */
export async function openPort(
  port: SerialPort,
  baudRate = 115200,
): Promise<SerialIO> {
  await port.open({ baudRate });

  // Decoder: Uint8Array -> string
  const textDecoder = new TextDecoderStream();
  const readableClosed = port.readable?.pipeTo(textDecoder.writable);
  if (!readableClosed) throw new Error("El puerto no es legible.");

  // Encoder: string -> Uint8Array
  const textEncoder = new TextEncoderStream();
  const writableClosed = textEncoder.readable.pipeTo(
    port.writable as WritableStream<Uint8Array>,
  );
  if (!writableClosed) throw new Error("El puerto no es escribible.");

  // Transformador de líneas
  const lineTransformer = new TransformStream<string, string>({
    transform(chunk, controller) {
      const lines = chunk.split(/\r?\n/);
      for (const line of lines) controller.enqueue(line);
    },
  });

  // Reader de LÍNEAS (string)
  const reader = textDecoder.readable.pipeThrough(lineTransformer).getReader();

  // Writer de STRING (escribes texto; el encoder lo convierte a bytes)
  const writer = textEncoder.writable.getWriter();

  const close = async () => {
    // libera en orden: writer -> reader -> cerrar puerto -> esperar pipes
    try {
      writer.releaseLock();
    } catch {
      console.error("error");
    }
    try {
      await reader.cancel();
    } catch {
      console.error("error");
    }
    try {
      await port.close();
    } catch {
      console.error("error");
    }
    try {
      await readableClosed;
    } catch {
      console.error("error");
    }
    try {
      await writableClosed;
    } catch {
      console.error("error");
    }
  };

  return { reader, writer, close };
}

/** Escribe una línea (agrega '\n' si falta) */
export async function writeLine(
  writer: LineWriter,
  line: string,
): Promise<void> {
  await writer.write(line.endsWith("\n") ? line : `${line}\n`);
}
