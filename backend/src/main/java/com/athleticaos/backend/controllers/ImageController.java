package com.athleticaos.backend.controllers;

import com.athleticaos.backend.services.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/images")
@RequiredArgsConstructor
@Tag(name = "Image Management", description = "Endpoints for uploading and retrieving images")
public class ImageController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Upload an image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
        String fileName = fileStorageService.storeFile(file);

        // Build the download URI
        // Assuming the file is served from a static path or a controller endpoint
        // For now, let's return the relative path or full URL if possible.
        // If we want to serve it via controller:
        /*
         * String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
         * .path("/api/v1/images/view/")
         * .path(fileName) // This might need the generated filename from storeFile
         * which returns "/uploads/uuid_name"
         * .toUriString();
         */
        // storeFile returns "/uploads/..." relative path from previous view.
        // Let's assume we serve it gracefully.

        return ResponseEntity.ok(Map.of("url", fileName));
    }

    @GetMapping("/view/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName, HttpServletRequest request) {
        // Load file as Resource
        Resource resource = fileStorageService.loadFileAsResource(fileName);

        // Try to determine file's content type
        String contentType = null;
        try {
            contentType = request.getServletContext().getMimeType(resource.getFile().getAbsolutePath());
        } catch (IOException ex) {
            // Logger.info("Could not determine file type.");
        }

        // Fallback to the default content type if type could not be determined
        if (contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
