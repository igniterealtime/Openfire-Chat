package org.jivesoftware.openfire.plugin.rest;

import com.sun.jersey.spi.container.ContainerRequest;
import com.sun.jersey.spi.container.ContainerResponse;
import com.sun.jersey.spi.container.ContainerResponseFilter;

import org.jivesoftware.openfire.http.HttpBindManager;

/**
 * The Class CORSFilter.
 */
public class CORSFilter implements ContainerResponseFilter {

    /* (non-Javadoc)
     * @see com.sun.jersey.spi.container.ContainerResponseFilter#filter(com.sun.jersey.spi.container.ContainerRequest, com.sun.jersey.spi.container.ContainerResponse)
     */
    @Override
    public ContainerResponse filter(ContainerRequest request, ContainerResponse response)
    {
        final HttpBindManager boshManager = HttpBindManager.getInstance();

        response.getHttpHeaders().add("Access-Control-Allow-Origin", boshManager.getCORSAllowOrigin());
        response.getHttpHeaders().add("Access-Control-Allow-Headers", HttpBindManager.HTTP_BIND_CORS_ALLOW_HEADERS_DEFAULT + ", Authorization");
        response.getHttpHeaders().add("Access-Control-Allow-Credentials", "true");
        response.getHttpHeaders().add("Access-Control-Allow-Methods", HttpBindManager.HTTP_BIND_CORS_ALLOW_METHODS_DEFAULT);

        return response;
    }
}
