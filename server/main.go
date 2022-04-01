package main

import (
	"fmt"
	"io/ioutil"

	"github.com/gin-gonic/gin"
)

func GetTestRoutes(r *gin.Engine) {
	r.GET("/api/get-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.GET("/api/get-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.GET("/api/get-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.GET("/api/get-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func PostTestRoutes(r *gin.Engine) {
	r.POST("/api/post-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.POST("/api/post-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.POST("/api/post-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.POST("/api/post-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func PutTestRoutes(r *gin.Engine) {
	r.PUT("/api/put-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.PUT("/api/put-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.PUT("/api/put-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.PUT("/api/put-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func DeleteTestRoutes(r *gin.Engine) {
	r.DELETE("/api/delete-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.DELETE("/api/delete-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.DELETE("/api/delete-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.DELETE("/api/delete-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func PatchTestRoutes(r *gin.Engine) {
	r.PATCH("/api/patch-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.PATCH("/api/patch-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.PATCH("/api/patch-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.PATCH("/api/patch-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func HeadTestRoutes(r *gin.Engine) {
	r.HEAD("/api/head-text", func(c *gin.Context) {
		// c.String(200, "hello world")
	})
	r.HEAD("/api/head-json", func(c *gin.Context) {
		// c.JSON(200, gin.H{
		// 	"key": "value",
		// })
	})
}

func main() {
	fmt.Println("hello")
	r := gin.Default()

	GetTestRoutes(r)
	PostTestRoutes(r)
	DeleteTestRoutes(r)
	PatchTestRoutes(r)
	HeadTestRoutes(r)
	PutTestRoutes(r)

	r.Use(func(c *gin.Context) {
		fmt.Println("[request.url]", c.Request.URL)
		fmt.Println("[request.headers]")
		for k, vals := range c.Request.Header {
			fmt.Print(k, ":")
			for _, val := range vals {
				fmt.Print(val, ", ")
			}
		}
		fmt.Println()
		body, _ := ioutil.ReadAll(c.Request.Body)
		fmt.Println("[request.body]", string(body))
	})

	r.Static("/es", "../es")
	r.StaticFile("/", "./index.html")

	r.GET("/api/res-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})

	r.GET("/api/res-json-content-type-json", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.JSON(200, gin.H{
			"key": "value",
		})
	})

	r.GET("/api/res-text", func(c *gin.Context) {
		c.String(200, "ok")
	})

	r.POST("/api/res-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})

	r.POST("/api/res-json-content-type-json", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.JSON(200, gin.H{
			"key": "value",
		})
	})

	r.Run() // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
}
