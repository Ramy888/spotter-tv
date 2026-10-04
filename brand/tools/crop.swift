// Crops a PNG and writes it as an opaque 24-bit RGB PNG (the Appstore rejects transparency).
// Usage: swift crop.swift <in.png> <out.png> <x> <y> <width> <height>   (pixels, from top-left)
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count == 7, let x = Int(a[3]), let y = Int(a[4]), let w = Int(a[5]), let h = Int(a[6]),
      let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil),
      let cropped = image.cropping(to: CGRect(x: x, y: y, width: w, height: h)) else {
  print("usage: crop.swift in.png out.png x y width height"); exit(1)
}
// Draw onto an opaque RGB canvas (no alpha channel).
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: w, height: h))
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)
