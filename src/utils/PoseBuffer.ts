import { PoseFrame } from '../types/pose';

/**
 * Circular buffer for storing pose frames.
 * Maintains a fixed-size history of poses for timing analysis and smoothing.
 */
export class PoseBuffer {
  private buffer: PoseFrame[] = [];
  private maxSize: number;

  constructor(maxSize: number = 60) {
    this.maxSize = maxSize;
  }

  /**
   * Add a pose to the buffer. If buffer is full, oldest pose is removed.
   */
  push(pose: PoseFrame): void {
    this.buffer.push(pose);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get the most recent pose in the buffer.
   */
  getLatest(): PoseFrame | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  /**
   * Find the pose closest to a given timestamp within tolerance.
   */
  getAtTime(timestamp: number, toleranceMs: number = 100): PoseFrame | null {
    let closest: PoseFrame | null = null;
    let minDiff = Infinity;

    for (const pose of this.buffer) {
      const diff = Math.abs(pose.timestamp - timestamp);
      if (diff < minDiff && diff <= toleranceMs) {
        minDiff = diff;
        closest = pose;
      }
    }
    return closest;
  }

  /**
   * Get all poses within a time range.
   */
  getRange(startMs: number, endMs: number): PoseFrame[] {
    return this.buffer.filter(p => p.timestamp >= startMs && p.timestamp <= endMs);
  }

  /**
   * Clear all poses from the buffer.
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get the number of poses in the buffer.
   */
  get length(): number {
    return this.buffer.length;
  }
}
