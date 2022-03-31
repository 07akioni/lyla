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
